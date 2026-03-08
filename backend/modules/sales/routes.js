const express = require('express');
const router = express.Router();
const salesController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Create a new sale from the POS
// Uses audit middleware to log the sale
router.post('/', auditMiddleware('Sales'), salesController.createSale);

// Get sales history (cashiers can see their own, admins see all)
router.get('/', salesController.getSalesHistory);

// Get specific sale details (receipt data)
router.get('/:id', salesController.getSaleDetails);

// Void a sale (admin/manager only)
router.post('/:id/void', authorizeRole(['admin', 'manager']), auditMiddleware('Sales'), salesController.voidSale);

module.exports = router;
