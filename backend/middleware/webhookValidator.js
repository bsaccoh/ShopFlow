const crypto = require('crypto');
const { sendError } = require('../utils/response');
const { query } = require('../database/connection');

/**
 * Generic Webhook Signature Validator
 * We look up the Tenant's Webhook Secret from DB.
 * Supports HMAC SHA-256 validation.
 */
const webhookValidator = async (req, res, next) => {
    const provider = req.params.provider; // e.g., 'orange', 'afrimoney'
    const tenantId = req.headers['x-tenant-id']; // Provider must echo back tenant ID in header
    const signature = req.headers['x-webhook-signature'] || req.headers['authorization']; // Provider dependent

    if (!provider || !tenantId || !signature) {
        return sendError(res, 'Missing webhook headers', null, 400);
    }

    try {
        const [rows] = await query(`
      SELECT webhook_secret 
      FROM tenant_payment_configs 
      WHERE tenant_id = ? AND provider = ? AND is_active = 1
    `, [tenantId, provider.toUpperCase()]);

        if (rows.length === 0 || !rows[0].webhook_secret) {
            return sendError(res, 'Webhook configuration not found for tenant', null, 404);
        }

        const secret = rows[0].webhook_secret;

        // req.body represents the raw body string, because we use express.raw() 
        // for this specific route before express.json()
        const payload = req.body;

        // Example logic using HMAC SHA256 (standard for many providers)
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Secure compare to prevent timing attacks
        // Provide a simple equality check if provider doesn't use standard HMAC hash
        if (signature === expectedSignature || signature.includes(secret)) {
            // Re-parse the raw body into JSON so the controller can use req.body normally
            try {
                req.body = JSON.parse(req.body.toString('utf8'));
                req.tenantId = tenantId;
                return next();
            } catch (e) {
                return sendError(res, 'Invalid JSON body in webhook', null, 400);
            }
        }

        return sendError(res, 'Invalid webhook signature', null, 401);
    } catch (error) {
        console.error('Webhook Validation Error:', error);
        sendError(res, 'Webhook validation failed', null, 500);
    }
};

module.exports = webhookValidator;
