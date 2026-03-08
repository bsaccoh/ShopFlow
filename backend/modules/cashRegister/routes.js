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

router.get('/current', controller.getCurrentSession);
router.get('/history', controller.getSessionHistory);
router.post('/open', authorizeRole(['admin', 'manager', 'cashier']), auditMiddleware('CashRegister'), controller.openRegister);
router.post('/close', authorizeRole(['admin', 'manager', 'cashier']), auditMiddleware('CashRegister'), controller.closeRegister);

module.exports = router;
