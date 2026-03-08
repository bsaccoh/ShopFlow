const express = require('express');
const router = express.Router();
const paymentController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const webhookValidator = require('../../middleware/webhookValidator');
const { auditMiddleware } = require('../../middleware/auditLogger');

// -----------------------------------------------------
// PUBLIC / WEBHOOK ROUTES (No JWT/Tenant Guards)
// -----------------------------------------------------

// The raw body is parsed by express.raw() in server.js before this route
// The webhook validator uses HMAC to verify the payload is from the provider
router.post(
    '/webhook/:provider',
    webhookValidator,
    paymentController.handleWebhook
);

// -----------------------------------------------------
// SECURE ROUTES
// -----------------------------------------------------
router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Initiate a mobile money payment push to customer's phone
router.post(
    '/mobile-money/request',
    auditMiddleware('Payments'),
    paymentController.initiateMobileMoney
);

// Check payment status manually
router.get(
    '/mobile-money/status/:transaction_id',
    paymentController.checkPaymentStatus
);

// Tenant Admin: Manage payment configurations (API Keys)
router.use(authorizeRole(['admin']));

router.get('/config', paymentController.getPaymentConfigs);
router.post('/config/:provider', auditMiddleware('PaymentConfig'), paymentController.savePaymentConfig);

module.exports = router;
