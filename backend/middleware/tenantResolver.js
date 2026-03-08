const { sendError } = require('../utils/response');

/**
 * Tenant Resolver Middleware
 * Extracts the tenant identifier from the request and attaches the ID to req.tenantId.
 * We resolve the tenant from:
 * 1. req.user.tenantId (if authenticated via JWT)
 * 2. x-tenant-id header (for API keys or unauthenticated routes that need context)
 */
const tenantResolver = (req, res, next) => {
    // If authentication middleware already ran and attached user
    if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId;
        return next();
    }

    // Fallback to explicit header
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId) {
        req.tenantId = parseInt(headerTenantId, 10);
        return next();
    }

    // Note: We don't block here. Some routes (like super admin or public login)
    // don't require a tenant. We use `tenantGuard` to enforce presence when required.
    next();
};

module.exports = tenantResolver;
