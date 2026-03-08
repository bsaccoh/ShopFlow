const { query } = require('../database/connection');

/**
 * Immutable Audit Logger Service
 * Used to log business logic events manually or via middleware wrapper
 */
const logAudit = async ({
    tenantId = null,
    userId = null,
    module,
    action,
    recordId = null,
    oldData = null,
    newData = null,
    ipAddress = null,
    userAgent = null
}) => {

    try {
        await query(`
      INSERT INTO audit_logs 
      (tenant_id, user_id, module, action, record_id, old_data, new_data, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            tenantId,
            userId,
            module,
            action,
            recordId,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            ipAddress,
            userAgent
        ]);
    } catch (error) {
        // We log but don't crash the main process if auditing fails
        console.error('Failed to write audit log:', error);
    }
};

/**
 * Express Middleware to track request IP and User-Agent 
 * and attach an `auditLog` trigger function to the request object.
 */
const auditMiddleware = (moduleName) => {
    return (req, res, next) => {
        req.audit = async (action, recordId, oldData, newData) => {
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const userId = req.user ? req.user.id : null;
            const tenantId = req.tenantId || (req.user ? req.user.tenantId : null);

            await logAudit({
                tenantId,
                userId,
                module: moduleName,
                action,
                recordId,
                oldData,
                newData,
                ipAddress,
                userAgent
            });
        };
        next();
    };
};

module.exports = {
    logAudit,
    auditMiddleware
};
