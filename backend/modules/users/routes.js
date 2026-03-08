const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

// Staff routes are protected and tenant isolated
router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Only admins and managers can manage staff
router.use(authorizeRole(['admin', 'manager']));

router.get('/', controller.getStaff);
router.post('/', auditMiddleware('Staff'), controller.createStaff);
router.put('/:id', auditMiddleware('Staff'), controller.updateStaff);

module.exports = router;
