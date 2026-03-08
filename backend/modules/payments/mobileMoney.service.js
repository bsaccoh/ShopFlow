const { encrypt, decrypt } = require('../../utils/encryption');
const { query } = require('../../database/connection');

// Mock API Call simulating Orange Money / Afrimoney Push
const simulateProviderPush = async (provider, phoneNumber, amount, transactionId, config) => {
    console.log(`[${provider} API] Push payment initiated for ${phoneNumber}. Amount: ${amount}`);
    // In a real system you would use axios to call the provider API:
    // await axios.post(config.apiUrl, { phone: phoneNumber, amount, reference: transactionId }, { headers: { 'Authorization': `Bearer ${config.apiKey}` }});

    return {
        success: true,
        provider_reference: `PRV-${Date.now()}`,
        status: 'PENDING_USER_PIN'
    };
};

const initiatePayment = async (tenantId, saleId, provider, phoneNumber, amount) => {
    // 1. Get Tenant's API keys for this provider
    const [configRows] = await query(`
    SELECT * FROM tenant_payment_configs WHERE tenant_id = ? AND provider = ? AND is_active = 1
  `, [tenantId, provider]);

    if (configRows.length === 0) {
        throw new Error(`${provider} is not configured or activated for this tenant`);
    }

    const config = configRows[0];
    const apiKey = decrypt(config.api_key);
    // Business number, etc., would also be used

    // 2. Create Transaction Record
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await query(`
    INSERT INTO mobile_money_transactions 
    (tenant_id, sale_id, provider, phone_number, external_transaction_id, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `, [tenantId, saleId || null, provider, phoneNumber, transactionId, amount]);

    // 3. Call Provider API
    try {
        const apiResponse = await simulateProviderPush(provider, phoneNumber, amount, transactionId, { apiKey });

        await query(`
      UPDATE mobile_money_transactions SET provider_response = ? WHERE id = ?
    `, [JSON.stringify(apiResponse), result.insertId]);

        return {
            transactionId,
            status: 'PENDING',
            message: 'Payment prompt sent to customer. Waiting for PIN entry.'
        };
    } catch (error) {
        await query(`
      UPDATE mobile_money_transactions SET status = 'FAILED', provider_response = ? WHERE id = ?
    `, [JSON.stringify({ error: error.message }), result.insertId]);
        throw error;
    }
};

const processWebhook = async (tenantId, provider, payload) => {
    // Provider Payload structure varies. Assuming generic standard:
    // { status: 'SUCCESS'|'FAILED', reference: 'TXN-xxx', amount: 100, provider_ref: 'PRV-xxx' }

    const transactionId = payload.reference;
    const status = payload.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';

    // 1. Get transaction
    const [txnRows] = await query(`
    SELECT * FROM mobile_money_transactions WHERE tenant_id = ? AND external_transaction_id = ? FOR UPDATE
  `, [tenantId, transactionId]);

    if (txnRows.length === 0) {
        console.error(`Webhook Warning: Transaction ${transactionId} not found for tenant ${tenantId}`);
        return;
    }

    const txn = txnRows[0];
    if (txn.status !== 'PENDING') {
        console.log(`Webhook Ignored: Transaction ${transactionId} already processed (Status: ${txn.status})`);
        return;
    }

    // 2. Verify Amount (Security Check against manipulation)
    if (parseFloat(payload.amount) !== parseFloat(txn.amount)) {
        console.error(`Webhook Mismatch: Expected ${txn.amount}, received ${payload.amount}`);
        // Keep it pending for reconciliation to flag flag it, or mark failed
        await query(`
      UPDATE mobile_money_transactions SET status = 'FAILED', provider_response = ? WHERE id = ?
    `, [JSON.stringify({ ...payload, error: 'Amount mismatch' }), txn.id]);
        return;
    }

    // 3. Update Transaction
    await query(`
    UPDATE mobile_money_transactions 
    SET status = ?, provider_response = ?, webhook_received_at = NOW(), verified_at = NOW()
    WHERE id = ?
  `, [status, JSON.stringify(payload), txn.id]);

    // 4. Update Sale & Payments if SUCCESS
    if (status === 'SUCCESS' && txn.sale_id) {
        // We update the associated POS payment record
        await query(`
      UPDATE payments SET status = 'SUCCESS', reference = ? WHERE sale_id = ? AND method = 'MOBILE_MONEY' AND amount = ?
    `, [payload.provider_ref || transactionId, txn.sale_id, txn.amount]);

        // Check if sale is fully paid now
        const [payments] = await query('SELECT SUM(amount) as paid FROM payments WHERE sale_id = ? AND status = "SUCCESS"', [txn.sale_id]);
        const [sale] = await query('SELECT total_amount FROM sales WHERE id = ?', [txn.sale_id]);

        if (payments[0].paid >= sale[0].total_amount) {
            await query(`UPDATE sales SET payment_status = 'PAID' WHERE id = ?`, [txn.sale_id]);
        } else {
            await query(`UPDATE sales SET payment_status = 'PARTIAL' WHERE id = ?`, [txn.sale_id]);
        }
    }
};

const getConfig = async (tenantId) => {
    const [configs] = await query('SELECT id, provider, is_active, created_at, business_number FROM tenant_payment_configs WHERE tenant_id = ?', [tenantId]);
    return configs;
};

const saveConfig = async (tenantId, provider, data) => {
    const encApiKey = data.api_key ? encrypt(data.api_key) : null;
    const encSecret = data.secret_key ? encrypt(data.secret_key) : null;
    const webSecret = data.webhook_secret; // Often kept plain to verify HMAC quickly, or encrypted. We keep plain for fast webhook verification.

    await query(`
    INSERT INTO tenant_payment_configs (tenant_id, provider, api_key, secret_key, webhook_secret, business_number, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      api_key = IFNULL(VALUES(api_key), api_key),
      secret_key = IFNULL(VALUES(secret_key), secret_key),
      webhook_secret = IFNULL(VALUES(webhook_secret), webhook_secret),
      business_number = IFNULL(VALUES(business_number), business_number),
      is_active = VALUES(is_active)
  `, [tenantId, provider, encApiKey, encSecret, webSecret, data.business_number || null, data.is_active !== undefined ? data.is_active : 1]);

    return true;
};

module.exports = {
    initiatePayment,
    processWebhook,
    getConfig,
    saveConfig
};
