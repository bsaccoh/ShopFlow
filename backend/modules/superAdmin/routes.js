const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get('/dashboard', controller.getDashboardStats);
router.get('/tenants', controller.getTenants);
router.get('/tenants/:id', controller.getTenantById);
router.put('/tenants/:id', controller.updateTenant);
router.patch('/tenants/:id/status', controller.updateTenantStatus);
router.get('/subscriptions', controller.getSubscriptions);

// Subscription Plans CRUD
router.get('/plans', controller.getPlans);
router.post('/plans', controller.createPlan);
router.put('/plans/:id', controller.updatePlan);
router.delete('/plans/:id', controller.deletePlan);

// Admin Users Management
router.get('/admin-users', controller.getAdminUsers);
router.post('/admin-users', controller.createAdminUser);
router.patch('/admin-users/:id/status', controller.updateAdminStatus);

// Activity Logs
router.get('/activity-logs', controller.getActivityLogs);

module.exports = router;
