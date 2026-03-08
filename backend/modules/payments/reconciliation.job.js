const cron = require('node-cron');
const { query } = require('../../database/connection');
const { processWebhook } = require('./mobileMoney.service');

// Example simulated API call to verify a transaction manually if webhook failed
const simulateStatusCheck = async (provider, externalTransactionId) => {
    // Randomly simulate success or failure for the sake of the mock
    const isSuccess = Math.random() > 0.3; // 70% chance of success
    return {
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        reference: externalTransactionId,
        amount: 0, // In real life, fetch amount
        provider_ref: `PRV-${Date.now()}`
    };
};

/**
 * Reconciliation Engine
 * Runs every 10 minutes to verify PENDING transactions older than 5 minutes
 */
const startReconciliationJob = () => {
    console.log('Starting Reconciliation Job cron...');

    // Run every 10 minutes (* /10 * * * *)
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Reconciliation] Running reconciliation job...');

        try {
            // Find PENDING transactions older than 5 minutes but less than 24 hours
            const [pendingTxns] = await query(`
        SELECT * FROM mobile_money_transactions
        WHERE status = 'PENDING' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

            if (pendingTxns.length === 0) {
                console.log('[Reconciliation] No pending transactions found.');
                return;
            }

            console.log(`[Reconciliation] Found ${pendingTxns.length} pending transactions. Verifying...`);

            for (const txn of pendingTxns) {
                try {
                    // 1. Fetch Tenant Config (requires API key)
                    // (In a real app, you would fetch the API key and query the provider's /status endpoint)
                    // For now, we simulate the status check
                    const providerResponse = await simulateStatusCheck(txn.provider, txn.external_transaction_id);

                    // Give amount context to provider response since we mocked it
                    providerResponse.amount = txn.amount;

                    // 2. We can reuse the webhook processing logic to handle state transition
                    // because conceptually a manual verify is identical to a late webhook
                    if (providerResponse.status !== 'PENDING') {
                        await processWebhook(txn.tenant_id, txn.provider, providerResponse);
                        console.log(`[Reconciliation] Reconciled transaction ${txn.external_transaction_id} -> ${providerResponse.status}`);
                    } else {
                        // Still pending, check if expired (e.g. older than 30 mins)
                        const txnDate = new Date(txn.created_at);
                        const now = new Date();
                        const diffMins = (now - txnDate) / (1000 * 60);

                        if (diffMins > 30) {
                            await query(`UPDATE mobile_money_transactions SET status = 'EXPIRED' WHERE id = ?`, [txn.id]);
                            console.log(`[Reconciliation] Expired transaction ${txn.external_transaction_id}`);
                        }
                    }
                } catch (err) {
                    console.error(`[Reconciliation] Error verifying txn ${txn.external_transaction_id}:`, err);
                }
            }

        } catch (error) {
            console.error('[Reconciliation] Job failed:', error);
        }
    });
};

module.exports = {
    startReconciliationJob
};
