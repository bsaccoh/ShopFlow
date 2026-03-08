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

router.get('/', controller.getTaxRates);
router.get('/overview', controller.getAllTenantTaxes);
router.post('/', authorizeRole(['admin']), auditMiddleware('TaxConfig'), controller.createTaxRate);
router.put('/:id', authorizeRole(['admin']), auditMiddleware('TaxConfig'), controller.updateTaxRate);
router.delete('/:id', authorizeRole(['admin']), auditMiddleware('TaxConfig'), controller.deleteTaxRate);

module.exports = router;
