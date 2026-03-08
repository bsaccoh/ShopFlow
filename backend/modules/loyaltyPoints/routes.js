const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const authorizeRole = require('../../middleware/rbac');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

router.get('/summary', controller.getSummary);
router.get('/:customerId', controller.getCustomerHistory);
router.post('/:customerId', authorizeRole(['admin', 'manager', 'cashier']), auditMiddleware('LoyaltyPoints'), controller.addTransaction);

module.exports = router;
