const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

router.get('/dashboard', controller.getTenantDashboardStats);
router.get('/sales', controller.getSalesReport);
router.get('/low-stock', controller.getLowStockItems);
router.get('/profit-loss', controller.getProfitAndLoss);

module.exports = router;
