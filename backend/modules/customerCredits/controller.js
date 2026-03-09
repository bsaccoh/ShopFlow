const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

// Get customer balance + transaction history
const getCustomerCredits = async (req, res) => {
    try {
        const customerId = req.params.customerId;

        // Verify customer belongs to tenant
        const [cust] = await query('SELECT id, name FROM customers WHERE id = ? AND tenant_id = ?', [customerId, req.tenantId]);
        if (cust.length === 0) return sendError(res, 'Customer not found', null, 404);

        // Get all credit/payment records
        const [records] = await query(`
            SELECT cc.*, CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
            FROM customer_credits cc
            LEFT JOIN users u ON cc.recorded_by = u.id
            WHERE cc.tenant_id = ? AND cc.customer_id = ?
            ORDER BY cc.created_at DESC
        `, [req.tenantId, customerId]);

        // Calculate balance (CREDIT adds debt, PAYMENT reduces)
        const balance = records.reduce((sum, r) => {
            return r.type === 'CREDIT' ? sum + parseFloat(r.amount) : sum - parseFloat(r.amount);
        }, 0);

        return sendSuccess(res, 'Customer credits retrieved', {
            customer: cust[0],
            balance,
            records
        });
    } catch (error) {
        return sendError(res, 'Failed to fetch credits', error.message, 500);
    }
};

// Add credit or record payment
const addCreditRecord = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const { type, amount, description, sale_id } = req.body;

        if (!type || !amount) return sendError(res, 'Type and amount are required', null, 400);
        if (!['CREDIT', 'PAYMENT'].includes(type)) return sendError(res, 'Type must be CREDIT or PAYMENT', null, 400);

        const [result] = await query(`
            INSERT INTO customer_credits (tenant_id, customer_id, sale_id, type, amount, description, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, customerId, sale_id || null, type, amount, description || null, req.user.id]);

        if (req.audit) await req.audit('CUSTOMER_CREDIT', result.insertId, null, { customer_id: customerId, type, amount });
        return sendSuccess(res, 'Credit record added', { id: result.insertId }, 201);
    } catch (error) {
        return sendError(res, 'Failed to add credit record', error.message, 500);
    }
};

// Get all customers with outstanding balances
const getDebtors = async (req, res) => {
    try {
        const [debtors] = await query(`
            SELECT * FROM (
                SELECT c.id, c.name, c.phone,
                       COALESCE(SUM(CASE WHEN cc.type = 'CREDIT' THEN cc.amount ELSE 0 END), 0) as total_credit,
                       COALESCE(SUM(CASE WHEN cc.type = 'PAYMENT' THEN cc.amount ELSE 0 END), 0) as total_payments,
                       COALESCE(SUM(CASE WHEN cc.type = 'CREDIT' THEN cc.amount ELSE 0 END), 0) -
                       COALESCE(SUM(CASE WHEN cc.type = 'PAYMENT' THEN cc.amount ELSE 0 END), 0) as balance
                FROM customers c
                LEFT JOIN customer_credits cc ON c.id = cc.customer_id AND cc.tenant_id = ?
                WHERE c.tenant_id = ?
                GROUP BY c.id, c.name, c.phone
            ) as debtor_summary
            WHERE balance > 0
            ORDER BY balance DESC
        `, [req.tenantId, req.tenantId]);

        const totalOwed = debtors.reduce((sum, d) => sum + parseFloat(d.balance), 0);

        return sendSuccess(res, 'Debtors list', { debtors, totalOwed });
    } catch (error) {
        return sendError(res, 'Failed to fetch debtors', error.message, 500);
    }
};

module.exports = { getCustomerCredits, addCreditRecord, getDebtors };
