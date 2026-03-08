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

router.get('/', controller.getPurchaseOrders);
router.get('/:id', controller.getPurchaseOrderDetails);
router.post('/', authorizeRole(['admin', 'manager']), auditMiddleware('PurchaseOrders'), controller.createPurchaseOrder);
router.patch('/:id/status', authorizeRole(['admin', 'manager']), auditMiddleware('PurchaseOrders'), controller.updatePOStatus);

module.exports = router;
