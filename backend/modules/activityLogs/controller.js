const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getTenantLogs = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { module, action, limit = 100, offset = 0 } = req.query;

        let sql = `
            SELECT al.*, u.first_name, u.last_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = ?
        `;
        const params = [tenantId];

        if (module) { sql += ' AND al.module = ?'; params.push(module); }
        if (action) { sql += ' AND al.action = ?'; params.push(action); }

        sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await query(sql, params);
        return sendSuccess(res, 'Activity logs retrieved', logs);
    } catch (error) {
        return sendError(res, 'Failed to fetch activity logs', error.message, 500);
    }
};

module.exports = { getTenantLogs };
