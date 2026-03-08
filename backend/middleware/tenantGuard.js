const { sendError } = require('../utils/response');
const { query } = require('../database/connection');

/**
 * Tenant Guard Middleware
 * Enforces that a tenantId is present and the tenant is active/valid.
 * MUST be run after `tenantResolver` or `auth` middleware.
 */
const tenantGuard = async (req, res, next) => {
    // Super admins operate above tenants, so we skip tenant verification for them
    if (req.user && req.user.isSuperAdmin) {
        return next();
    }

    if (!req.tenantId) {
        return sendError(res, 'Tenant context is missing. Request unauthorized.', null, 401);
    }

    try {
        // Optional: Cache this check in Redis in production to avoid DB hit every request
        const [rows] = await query('SELECT is_active, is_suspended, suspension_reason FROM tenants WHERE id = ?', [req.tenantId]);

        if (rows.length === 0) {
            return sendError(res, 'Invalid tenant.', null, 401);
        }

        const tenant = rows[0];

        if (!tenant.is_active) {
            return sendError(res, 'Tenant account is deactivated.', null, 403);
        }

        if (tenant.is_suspended) {
            return sendError(res, `Tenant account is suspended. Reason: ${tenant.suspension_reason || 'Billing issue'}`, null, 403);
        }

        // Attach verified tenant details if needed downstream
        req.tenant = tenant;
        next();
    } catch (error) {
        console.error('Tenant Guard Error:', error);
        sendError(res, 'Error verifying tenant status', null, 500);
    }
};

module.exports = tenantGuard;
