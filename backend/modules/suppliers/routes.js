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

router.get('/', controller.getSuppliers);
router.post('/', authorizeRole(['admin', 'manager']), auditMiddleware('Suppliers'), controller.createSupplier);
router.put('/:id', authorizeRole(['admin', 'manager']), auditMiddleware('Suppliers'), controller.updateSupplier);
router.delete('/:id', authorizeRole(['admin', 'manager']), auditMiddleware('Suppliers'), controller.deleteSupplier);

module.exports = router;
