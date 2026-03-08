const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const openRegister = async (req, res) => {
    try {
        const { opening_amount } = req.body;
        // Check for existing open session
        const [open] = await query('SELECT * FROM cash_register_sessions WHERE tenant_id = ? AND status = "OPEN"', [req.tenantId]);
        if (open.length > 0) return sendError(res, 'A register session is already open', null, 400);

        const [result] = await query(`
            INSERT INTO cash_register_sessions (tenant_id, opened_by, opening_amount)
            VALUES (?, ?, ?)
        `, [req.tenantId, req.user.id, opening_amount || 0]);

        if (req.audit) await req.audit('REGISTER_OPEN', result.insertId, null, { opening_amount });
        return sendSuccess(res, 'Register opened', { id: result.insertId }, 201);
    } catch (error) {
        return sendError(res, 'Failed to open register', error.message, 500);
    }
};

const closeRegister = async (req, res) => {
    try {
        const { actual_cash, notes } = req.body;
        const [open] = await query('SELECT * FROM cash_register_sessions WHERE tenant_id = ? AND status = "OPEN"', [req.tenantId]);
        if (open.length === 0) return sendError(res, 'No open register session found', null, 404);

        const session = open[0];

        // Calculate sales during this session
        const [salesData] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as total_transactions
            FROM sales WHERE tenant_id = ? AND created_at >= ? AND status != 'VOIDED'
        `, [req.tenantId, session.opened_at]);

        const totalSales = parseFloat(salesData[0].total_sales);
        const totalTransactions = salesData[0].total_transactions;
        const expectedCash = parseFloat(session.opening_amount) + totalSales;
        const difference = actual_cash !== null && actual_cash !== undefined
            ? parseFloat(actual_cash) - expectedCash : null;

        await query(`
            UPDATE cash_register_sessions
            SET status='CLOSED', closed_by=?, actual_cash=?, expected_cash=?, difference=?,
                total_sales=?, total_transactions=?, notes=?, closed_at=NOW()
            WHERE id=?
        `, [req.user.id, actual_cash, expectedCash, difference, totalSales, totalTransactions, notes || null, session.id]);

        if (req.audit) await req.audit('REGISTER_CLOSE', session.id, null, {
            opening_amount: session.opening_amount, expected_cash: expectedCash,
            actual_cash, difference, total_sales: totalSales, total_transactions: totalTransactions
        });

        return sendSuccess(res, 'Register closed', {
            id: session.id,
            opening_amount: session.opening_amount,
            expected_cash: expectedCash,
            actual_cash,
            difference,
            total_sales: totalSales,
            total_transactions: totalTransactions
        });
    } catch (error) {
        return sendError(res, 'Failed to close register', error.message, 500);
    }
};

const getCurrentSession = async (req, res) => {
    try {
        const [open] = await query(`
            SELECT crs.*, CONCAT(u.first_name, ' ', u.last_name) as opened_by_name
            FROM cash_register_sessions crs
            LEFT JOIN users u ON crs.opened_by = u.id
            WHERE crs.tenant_id = ? AND crs.status = 'OPEN'
        `, [req.tenantId]);

        if (open.length === 0) return sendSuccess(res, 'No open session', null);

        // Get running total
        const [salesData] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as running_total, COUNT(*) as txn_count
            FROM sales WHERE tenant_id = ? AND created_at >= ? AND status != 'VOIDED'
        `, [req.tenantId, open[0].opened_at]);

        return sendSuccess(res, 'Current session', {
            ...open[0],
            running_total: salesData[0].running_total,
            transaction_count: salesData[0].txn_count
        });
    } catch (error) {
        return sendError(res, 'Failed to get session', error.message, 500);
    }
};

const getSessionHistory = async (req, res) => {
    try {
        const [sessions] = await query(`
            SELECT crs.*,
                   CONCAT(o.first_name, ' ', o.last_name) as opened_by_name,
                   CONCAT(c.first_name, ' ', c.last_name) as closed_by_name
            FROM cash_register_sessions crs
            LEFT JOIN users o ON crs.opened_by = o.id
            LEFT JOIN users c ON crs.closed_by = c.id
            WHERE crs.tenant_id = ?
            ORDER BY crs.opened_at DESC LIMIT 30
        `, [req.tenantId]);
        return sendSuccess(res, 'Session history', sessions);
    } catch (error) {
        return sendError(res, 'Failed to get history', error.message, 500);
    }
};

module.exports = { openRegister, closeRegister, getCurrentSession, getSessionHistory };
