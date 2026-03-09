const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getDiscounts = async (req, res) => {
    try {
        const [discounts] = await query('SELECT * FROM discounts WHERE tenant_id = ? ORDER BY created_at DESC', [req.tenantId]);
        const formatted = discounts.map(d => ({
            ...d,
            is_active: Buffer.isBuffer(d.is_active) ? d.is_active[0] === 1 : (d.is_active == 1)
        }));
        return sendSuccess(res, 'Discounts retrieved', formatted);
    } catch (error) {
        return sendError(res, 'Failed to fetch discounts', error.message, 500);
    }
};

const createDiscount = async (req, res) => {
    try {
        const { name, code, type, value, min_order_amount, max_uses, start_date, end_date } = req.body;
        if (!name || !type || !value) return sendError(res, 'Name, type, and value are required', null, 400);

        const [result] = await query(`
            INSERT INTO discounts (tenant_id, name, code, type, value, min_order_amount, max_uses, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, name, code || null, type, value, min_order_amount || 0, max_uses || null, start_date || null, end_date || null]);

        if (req.audit) await req.audit('DISCOUNT_CREATE', result.insertId, null, { name, code, type, value });
        return sendSuccess(res, 'Discount created', { id: result.insertId }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create discount', error.message, 500);
    }
};

const updateDiscount = async (req, res) => {
    try {
        const { name, code, type, value, min_order_amount, max_uses, start_date, end_date, is_active } = req.body;
        const [existing] = await query('SELECT * FROM discounts WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Discount not found', null, 404);

        await query(`
            UPDATE discounts SET name=?, code=?, type=?, value=?, min_order_amount=?, max_uses=?, start_date=?, end_date=?, is_active=?
            WHERE id=? AND tenant_id=?
        `, [name, code, type, value, min_order_amount || 0, max_uses || null, start_date || null, end_date || null, is_active !== undefined ? is_active : 1, req.params.id, req.tenantId]);

        if (req.audit) await req.audit('DISCOUNT_UPDATE', req.params.id, existing[0], req.body);
        return sendSuccess(res, 'Discount updated');
    } catch (error) {
        return sendError(res, 'Failed to update discount', error.message, 500);
    }
};

const deleteDiscount = async (req, res) => {
    try {
        const [existing] = await query('SELECT * FROM discounts WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Discount not found', null, 404);
        await query('DELETE FROM discounts WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (req.audit) await req.audit('DISCOUNT_DELETE', req.params.id, existing[0], null);
        return sendSuccess(res, 'Discount deleted');
    } catch (error) {
        return sendError(res, 'Failed to delete discount', error.message, 500);
    }
};

// Validate a coupon code for POS
const validateCoupon = async (req, res) => {
    try {
        const { code, order_total } = req.body;
        if (!code) return sendError(res, 'Coupon code is required', null, 400);

        const [discounts] = await query(`
            SELECT * FROM discounts WHERE tenant_id = ? AND code = ? AND is_active = true
        `, [req.tenantId, code]);

        if (discounts.length === 0) return sendError(res, 'Invalid coupon code', null, 404);
        const d = discounts[0];

        const now = new Date();
        if (d.start_date && new Date(d.start_date) > now) return sendError(res, 'Coupon not yet active', null, 400);
        if (d.end_date && new Date(d.end_date) < now) return sendError(res, 'Coupon has expired', null, 400);
        if (d.max_uses && d.used_count >= d.max_uses) return sendError(res, 'Coupon usage limit reached', null, 400);
        if (order_total && d.min_order_amount > 0 && order_total < d.min_order_amount) {
            return sendError(res, `Minimum order amount is Le ${d.min_order_amount}`, null, 400);
        }

        const discount_amount = d.type === 'PERCENTAGE' ? (order_total * d.value / 100) : d.value;
        return sendSuccess(res, 'Coupon valid', { id: d.id, name: d.name, type: d.type, value: d.value, discount_amount });
    } catch (error) {
        return sendError(res, 'Failed to validate coupon', error.message, 500);
    }
};

module.exports = { getDiscounts, createDiscount, updateDiscount, deleteDiscount, validateCoupon };
