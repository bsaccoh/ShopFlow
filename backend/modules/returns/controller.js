const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getReturns = async (req, res) => {
    try {
        const [returns] = await query(`
            SELECT r.*, s.sale_number, c.name as customer_name,
                   CONCAT(u.first_name, ' ', u.last_name) as processed_by_name
            FROM returns r
            LEFT JOIN sales s ON r.sale_id = s.id
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.tenant_id = ?
            ORDER BY r.created_at DESC
        `, [req.tenantId]);
        return sendSuccess(res, 'Returns retrieved', returns);
    } catch (error) {
        return sendError(res, 'Failed to fetch returns', error.message, 500);
    }
};

const createReturn = async (req, res) => {
    try {
        const { sale_id, reason, items, refund_method = 'CASH' } = req.body;
        if (!sale_id || !reason || !items || items.length === 0) {
            return sendError(res, 'Sale ID, reason, and items are required', null, 400);
        }

        // Verify sale belongs to tenant
        const [sales] = await query('SELECT * FROM sales WHERE id = ? AND tenant_id = ?', [sale_id, req.tenantId]);
        if (sales.length === 0) return sendError(res, 'Sale not found', null, 404);

        const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`;
        const refundAmount = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);

        const [result] = await query(`
            INSERT INTO returns (tenant_id, return_number, sale_id, customer_id, reason, refund_amount, refund_method)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, returnNumber, sale_id, sales[0].customer_id, reason, refundAmount, refund_method]);

        // Insert return items
        for (const item of items) {
            await query(`
                INSERT INTO return_items (return_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)
            `, [result.insertId, item.product_id, item.quantity, item.unit_price]);
        }

        if (req.audit) await req.audit('RETURN_CREATE', result.insertId, null, { returnNumber, sale_id, reason, refundAmount });

        return sendSuccess(res, 'Return created', { id: result.insertId, return_number: returnNumber, refund_amount: refundAmount }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create return', error.message, 500);
    }
};

const processReturn = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['APPROVED', 'REJECTED', 'REFUNDED'].includes(status)) {
            return sendError(res, 'Invalid status', null, 400);
        }

        const [existing] = await query('SELECT * FROM returns WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Return not found', null, 404);

        await query(`
            UPDATE returns SET status = ?, processed_by = ?, processed_at = NOW() WHERE id = ? AND tenant_id = ?
        `, [status, req.user.id, req.params.id, req.tenantId]);

        // If approved/refunded, adjust inventory (add items back)
        if (status === 'APPROVED' || status === 'REFUNDED') {
            const [returnItems] = await query('SELECT * FROM return_items WHERE return_id = ?', [req.params.id]);
            for (const item of returnItems) {
                await query('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND tenant_id = ?',
                    [item.quantity, item.product_id, req.tenantId]);
            }
        }

        if (req.audit) await req.audit('RETURN_PROCESS', req.params.id, existing[0], { status });

        return sendSuccess(res, `Return ${status.toLowerCase()}`);
    } catch (error) {
        return sendError(res, 'Failed to process return', error.message, 500);
    }
};

module.exports = { getReturns, createReturn, processReturn };
