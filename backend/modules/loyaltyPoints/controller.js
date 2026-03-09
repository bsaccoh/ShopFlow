const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

// Get all customers with their loyalty point balances
const getSummary = async (req, res) => {
    try {
        const [customers] = await query(`
            SELECT c.id, c.name, c.email, c.phone,
                   COALESCE(SUM(CASE WHEN lp.type = 'EARNED' THEN lp.points ELSE 0 END), 0) as total_earned,
                   COALESCE(SUM(CASE WHEN lp.type = 'REDEEMED' THEN lp.points ELSE 0 END), 0) as total_redeemed,
                   COALESCE(SUM(CASE WHEN lp.type = 'ADJUSTED' THEN lp.points ELSE 0 END), 0) as total_adjusted,
                   COALESCE(SUM(CASE WHEN lp.type = 'EXPIRED' THEN lp.points ELSE 0 END), 0) as total_expired,
                   COALESCE(SUM(CASE WHEN lp.type = 'EARNED' THEN lp.points ELSE 0 END), 0)
                   + COALESCE(SUM(CASE WHEN lp.type = 'ADJUSTED' THEN lp.points ELSE 0 END), 0)
                   - COALESCE(SUM(CASE WHEN lp.type = 'REDEEMED' THEN lp.points ELSE 0 END), 0)
                   - COALESCE(SUM(CASE WHEN lp.type = 'EXPIRED' THEN lp.points ELSE 0 END), 0) as balance
            FROM customers c
            LEFT JOIN loyalty_points lp ON c.id = lp.customer_id AND lp.tenant_id = ?
            WHERE c.tenant_id = ? AND c.is_active = true
            GROUP BY c.id, c.name, c.email, c.phone
            ORDER BY balance DESC
        `, [req.tenantId, req.tenantId]);

        const totalPoints = customers.reduce((sum, c) => sum + parseInt(c.balance || 0), 0);

        return sendSuccess(res, 'Loyalty points summary', { customers, totalPoints });
    } catch (error) {
        return sendError(res, 'Failed to fetch loyalty summary', error.message, 500);
    }
};

// Get transaction history for a specific customer
const getCustomerHistory = async (req, res) => {
    try {
        const customerId = req.params.customerId;

        // Verify customer belongs to tenant
        const [cust] = await query('SELECT id, name, email, phone, loyalty_points FROM customers WHERE id = ? AND tenant_id = ?', [customerId, req.tenantId]);
        if (cust.length === 0) return sendError(res, 'Customer not found', null, 404);

        // Get all loyalty point transactions
        const [records] = await query(`
            SELECT lp.*, s.sale_number
            FROM loyalty_points lp
            LEFT JOIN sales s ON lp.sale_id = s.id
            WHERE lp.tenant_id = ? AND lp.customer_id = ?
            ORDER BY lp.created_at DESC
        `, [req.tenantId, customerId]);

        // Calculate balance
        const balance = records.reduce((sum, r) => {
            if (r.type === 'EARNED' || r.type === 'ADJUSTED') return sum + parseInt(r.points);
            return sum - parseInt(r.points);
        }, 0);

        return sendSuccess(res, 'Customer loyalty history', {
            customer: cust[0],
            balance,
            records
        });
    } catch (error) {
        return sendError(res, 'Failed to fetch customer history', error.message, 500);
    }
};

// Add a loyalty points transaction
const addTransaction = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const { type, points, description, sale_id } = req.body;

        if (!type || !points) return sendError(res, 'Type and points are required', null, 400);
        if (!['EARNED', 'REDEEMED', 'ADJUSTED', 'EXPIRED'].includes(type)) {
            return sendError(res, 'Type must be EARNED, REDEEMED, ADJUSTED, or EXPIRED', null, 400);
        }
        if (parseInt(points) <= 0) return sendError(res, 'Points must be a positive number', null, 400);

        // Verify customer belongs to tenant
        const [cust] = await query('SELECT id FROM customers WHERE id = ? AND tenant_id = ?', [customerId, req.tenantId]);
        if (cust.length === 0) return sendError(res, 'Customer not found', null, 404);

        // If redeeming, verify sufficient balance
        if (type === 'REDEEMED' || type === 'EXPIRED') {
            const [balanceRows] = await query(`
                SELECT
                    COALESCE(SUM(CASE WHEN type IN ('EARNED','ADJUSTED') THEN points ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN type IN ('REDEEMED','EXPIRED') THEN points ELSE 0 END), 0) as balance
                FROM loyalty_points
                WHERE tenant_id = ? AND customer_id = ?
            `, [req.tenantId, customerId]);

            const currentBalance = parseInt(balanceRows[0]?.balance || 0);
            if (parseInt(points) > currentBalance) {
                return sendError(res, `Insufficient points. Current balance: ${currentBalance}`, null, 400);
            }
        }

        const [result] = await query(`
            INSERT INTO loyalty_points (tenant_id, customer_id, sale_id, points, type, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.tenantId, customerId, sale_id || null, parseInt(points), type, description || null]);

        // Also update the loyalty_points field on the customer record
        const pointDelta = (type === 'EARNED' || type === 'ADJUSTED') ? parseInt(points) : -parseInt(points);
        await query('UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points + ?) WHERE id = ? AND tenant_id = ?', [pointDelta, customerId, req.tenantId]);

        if (req.audit) await req.audit('LOYALTY_POINTS', result.insertId, null, { customer_id: customerId, type, points });
        return sendSuccess(res, 'Loyalty points transaction added', { id: result.insertId }, 201);
    } catch (error) {
        return sendError(res, 'Failed to add loyalty transaction', error.message, 500);
    }
};

module.exports = { getSummary, getCustomerHistory, addTransaction };
