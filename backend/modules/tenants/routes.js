const express = require('express');
const router = express.Router();
const tenantController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Tenant admin only routes
router.use(authorizeRole(['admin']));

// Get current tenant profile/settings
router.get('/profile', tenantController.getTenantProfile);

// Update tenant profile/settings
router.put(
    '/profile',
    auditMiddleware('Tenants'),
    tenantController.updateTenantProfile
);

module.exports = router;
