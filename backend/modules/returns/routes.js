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

router.get('/', controller.getReturns);
router.post('/', authorizeRole(['admin', 'manager']), auditMiddleware('Returns'), controller.createReturn);
router.patch('/:id/process', authorizeRole(['admin', 'manager']), auditMiddleware('Returns'), controller.processReturn);

module.exports = router;
