const mmService = require('./mobileMoney.service');
const { sendSuccess, sendError } = require('../../utils/response');
const { query } = require('../../database/connection');

const initiateMobileMoney = async (req, res) => {
    try {
        const { provider, phone_number, amount, sale_id } = req.body;

        if (!provider || !phone_number || !amount) {
            return sendError(res, 'Provider, phone number, and amount are required', null, 400);
        }

        if (!['ORANGE', 'AFRIMONEY'].includes(provider.toUpperCase())) {
            return sendError(res, 'Unsupported provider', null, 400);
        }

        if (!req.subscriptionFeatures?.mobileMoney) {
            return sendError(res, 'Mobile Money integration is not active on your current plan', null, 403);
        }

        const result = await mmService.initiatePayment(req.tenantId, sale_id, provider.toUpperCase(), phone_number, amount);

        if (req.audit) await req.audit(`MM_PAYMENT_INIT_${provider}`, sale_id, null, { phone_number, amount, transactionId: result.transactionId });

        return sendSuccess(res, 'Payment requested', result);
    } catch (error) {
        if (error.message.includes('not configured')) {
            return sendError(res, error.message, null, 400);
        }
        return sendError(res, 'Failed to initiate payment', error.message, 500);
    }
};

const handleWebhook = async (req, res) => {
    try {
        // req.tenantId is attached by the webhookValidator using headers
        const tenantId = req.tenantId;
        const provider = req.params.provider.toUpperCase();
        const payload = req.body; // Safely parsed by validator

        // Process asynchronously so we don't block the provider
        mmService.processWebhook(tenantId, provider, payload).catch(err => {
            console.error(`Error processing webhook async for ${provider}:`, err);
        });

        // Provide standard success to Provider
        return res.status(200).send('OK');
    } catch (error) {
        console.error('Handle Webhook Error:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const checkPaymentStatus = async (req, res) => {
    try {
        const transactionId = req.params.transaction_id;
        const [txn] = await query('SELECT status, provider_response FROM mobile_money_transactions WHERE tenant_id = ? AND external_transaction_id = ?', [req.tenantId, transactionId]);

        if (!txn || txn.length === 0) return sendError(res, 'Transaction not found', null, 404);

        return sendSuccess(res, 'Status retrieved', txn[0]);
    } catch (error) {
        return sendError(res, 'Failed to retrieve status', error.message, 500);
    }
};

const getPaymentConfigs = async (req, res) => {
    try {
        const configs = await mmService.getConfig(req.tenantId);
        return sendSuccess(res, 'Configuration retrieved', configs);
    } catch (error) {
        return sendError(res, 'Failed to retrieve config', error.message, 500);
    }
};

const savePaymentConfig = async (req, res) => {
    try {
        const provider = req.params.provider.toUpperCase();
        await mmService.saveConfig(req.tenantId, provider, req.body);

        if (req.audit) await req.audit('UPDATE_PAYMENT_CONFIG', null, null, { provider });

        return sendSuccess(res, 'Configuration saved successfully');
    } catch (error) {
        return sendError(res, 'Failed to save config', error.message, 500);
    }
};

module.exports = {
    initiateMobileMoney,
    handleWebhook,
    checkPaymentStatus,
    getPaymentConfigs,
    savePaymentConfig
};
