const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getExpenses = async (req, res) => {
    try {
        const { start_date, end_date, category } = req.query;
        let sql = `SELECT e.*, CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
                    FROM expenses e LEFT JOIN users u ON e.recorded_by = u.id
                    WHERE e.tenant_id = ?`;
        const params = [req.tenantId];

        if (start_date) { sql += ' AND e.expense_date >= ?'; params.push(start_date); }
        if (end_date) { sql += ' AND e.expense_date <= ?'; params.push(end_date); }
        if (category) { sql += ' AND e.category = ?'; params.push(category); }
        sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

        const [expenses] = await query(sql, params);

        // Summary
        const [summary] = await query(`
            SELECT COALESCE(SUM(amount), 0) as total_expenses,
                   COUNT(*) as count,
                   category, COALESCE(SUM(amount), 0) as cat_total
            FROM expenses WHERE tenant_id = ?
            ${start_date ? 'AND expense_date >= ?' : ''}
            ${end_date ? 'AND expense_date <= ?' : ''}
            GROUP BY category ORDER BY cat_total DESC
        `, [req.tenantId, ...(start_date ? [start_date] : []), ...(end_date ? [end_date] : [])]);

        const [totalRow] = await query(`
            SELECT COALESCE(SUM(amount), 0) as grand_total FROM expenses WHERE tenant_id = ?
            ${start_date ? 'AND expense_date >= ?' : ''} ${end_date ? 'AND expense_date <= ?' : ''}
        `, [req.tenantId, ...(start_date ? [start_date] : []), ...(end_date ? [end_date] : [])]);

        return sendSuccess(res, 'Expenses retrieved', {
            expenses,
            summary: { total: totalRow[0]?.grand_total || 0, byCategory: summary }
        });
    } catch (error) {
        return sendError(res, 'Failed to fetch expenses', error.message, 500);
    }
};

const createExpense = async (req, res) => {
    try {
        const { category, description, amount, expense_date, payment_method, reference } = req.body;
        if (!description || !amount || !expense_date) {
            return sendError(res, 'Description, amount, and date are required', null, 400);
        }

        const [result] = await query(`
            INSERT INTO expenses (tenant_id, category, description, amount, expense_date, payment_method, reference, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, category || 'OTHER', description, amount, expense_date, payment_method || 'CASH', reference || null, req.user.id]);

        if (req.audit) await req.audit('EXPENSE_CREATE', result.insertId, null, { category, description, amount });
        return sendSuccess(res, 'Expense recorded', { id: result.insertId }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create expense', error.message, 500);
    }
};

const deleteExpense = async (req, res) => {
    try {
        const [existing] = await query('SELECT * FROM expenses WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Expense not found', null, 404);
        await query('DELETE FROM expenses WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (req.audit) await req.audit('EXPENSE_DELETE', req.params.id, existing[0], null);
        return sendSuccess(res, 'Expense deleted');
    } catch (error) {
        return sendError(res, 'Failed to delete expense', error.message, 500);
    }
};

module.exports = { getExpenses, createExpense, deleteExpense };
