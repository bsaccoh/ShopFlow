const { sendError } = require('../utils/response');

/**
 * Role-Based Access Control Middleware (RBAC)
 * @param {Array<string>|string} allowedRoles - Array of allowed role slugs (e.g., ['admin', 'manager'])
 */
const authorizeRole = (allowedRoles) => {
    if (typeof allowedRoles === 'string') {
        allowedRoles = [allowedRoles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 'User not authenticated', null, 401);
        }

        // Super Admins have universal access
        if (req.user.isSuperAdmin) {
            return next();
        }

        const userRole = req.user.role; // Attached during JWT verification

        if (!userRole) {
            return sendError(res, 'User has no assigned role', null, 403);
        }

        // Always allow admin if they are part of the tenant
        if (userRole === 'admin' || allowedRoles.includes(userRole)) {
            return next();
        }

        return sendError(res, 'Forbidden: Insufficient privileges to access this resource', null, 403);
    };
};

module.exports = authorizeRole;
