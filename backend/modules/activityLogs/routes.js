const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

router.get('/', controller.getTenantLogs);

module.exports = router;
