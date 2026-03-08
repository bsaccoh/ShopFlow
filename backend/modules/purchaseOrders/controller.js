const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getPurchaseOrders = async (req, res) => {
    try {
        const [orders] = await query(`
            SELECT po.*, s.name as supplier_name,
                   CONCAT(u.first_name, ' ', u.last_name) as ordered_by_name,
                   (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.ordered_by = u.id
            WHERE po.tenant_id = ?
            ORDER BY po.created_at DESC
        `, [req.tenantId]);
        return sendSuccess(res, 'Purchase orders retrieved', orders);
    } catch (error) {
        return sendError(res, 'Failed to fetch purchase orders', error.message, 500);
    }
};

const getPurchaseOrderDetails = async (req, res) => {
    try {
        const [orders] = await query(`
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = ? AND po.tenant_id = ?
        `, [req.params.id, req.tenantId]);
        if (orders.length === 0) return sendError(res, 'Purchase order not found', null, 404);

        const [items] = await query(`
            SELECT poi.*, p.name as product_name, p.sku
            FROM purchase_order_items poi
            JOIN products p ON poi.product_id = p.id
            WHERE poi.purchase_order_id = ?
        `, [req.params.id]);

        return sendSuccess(res, 'Purchase order details', { ...orders[0], items });
    } catch (error) {
        return sendError(res, 'Failed to fetch PO details', error.message, 500);
    }
};

const createPurchaseOrder = async (req, res) => {
    try {
        const { supplier_id, items, notes } = req.body;
        if (!supplier_id || !items || items.length === 0) {
            return sendError(res, 'Supplier and items are required', null, 400);
        }

        const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
        const totalAmount = items.reduce((sum, i) => sum + (i.quantity_ordered * i.unit_cost), 0);

        const [result] = await query(`
            INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, total_amount, notes, ordered_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.tenantId, poNumber, supplier_id, totalAmount, notes || null, req.user.id]);

        for (const item of items) {
            await query(`
                INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost)
                VALUES (?, ?, ?, ?)
            `, [result.insertId, item.product_id, item.quantity_ordered, item.unit_cost]);
        }

        if (req.audit) await req.audit('PO_CREATE', result.insertId, null, { poNumber, supplier_id, totalAmount });

        return sendSuccess(res, 'Purchase order created', { id: result.insertId, po_number: poNumber, total_amount: totalAmount }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create purchase order', error.message, 500);
    }
};

const updatePOStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'].includes(status)) {
            return sendError(res, 'Invalid status', null, 400);
        }

        const [existing] = await query('SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Purchase order not found', null, 404);

        await query('UPDATE purchase_orders SET status = ? WHERE id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId]);

        // If fully received, update inventory
        if (status === 'RECEIVED') {
            await query('UPDATE purchase_orders SET received_at = NOW() WHERE id = ?', [req.params.id]);
            const [items] = await query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
            for (const item of items) {
                await query(`
                    UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND tenant_id = ?
                `, [item.quantity_ordered, item.product_id, req.tenantId]);
                await query('UPDATE purchase_order_items SET quantity_received = quantity_ordered WHERE id = ?', [item.id]);
            }
        }

        if (req.audit) await req.audit('PO_STATUS', req.params.id, existing[0], { status });

        return sendSuccess(res, `Purchase order ${status.toLowerCase()}`);
    } catch (error) {
        return sendError(res, 'Failed to update PO status', error.message, 500);
    }
};

module.exports = { getPurchaseOrders, getPurchaseOrderDetails, createPurchaseOrder, updatePOStatus };
