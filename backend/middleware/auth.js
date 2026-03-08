const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

/**
 * JWT Authentication Middleware
 * Validates access token and attaches user payload to req.user
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'Authentication required. No token provided.', null, 401);
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return sendError(res, 'Malformed token', null, 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains id, tenantId, role_slug, etc.

        // Also set tenantId for tenantResolver explicitly if it hasn't been set
        if (!req.tenantId && decoded.tenantId) {
            req.tenantId = decoded.tenantId;
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendError(res, 'Token has expired', null, 401);
        }
        return sendError(res, 'Invalid token', null, 401);
    }
};

/**
 * Super Admin Authentication Middleware
 * Specifically checks if the user is a super admin platform-wide
 */
const authenticateSuperAdmin = (req, res, next) => {
    authenticate(req, res, () => {
        // We can define a convention where super admins don't have a tenantId and have a specific role flag
        if (req.user && req.user.isSuperAdmin) {
            next();
        } else {
            return sendError(res, 'Forbidden: Super Admin access required', null, 403);
        }
    });
}

module.exports = {
    authenticate,
    authenticateSuperAdmin
};
