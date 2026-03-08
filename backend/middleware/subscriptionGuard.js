const { sendError } = require('../utils/response');
const { query } = require('../database/connection');

/**
 * Subscription Guard Middleware
 * Ensures the tenant has an active subscription or is within trial period.
 * MUST be run after tenantGuard middleware.
 */
const subscriptionGuard = async (req, res, next) => {
    if (!req.tenantId) {
        return sendError(res, 'Tenant context missing', null, 500);
    }

    try {
        const [rows] = await query(`
      SELECT s.status, s.current_period_end, p.has_api_access, p.has_advanced_reports, p.has_multi_warehouse, p.has_mobile_money
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.tenant_id = ? 
      ORDER BY s.id DESC LIMIT 1
    `, [req.tenantId]);

        if (rows.length === 0) {
            return sendError(res, 'No active subscription found for this tenant', null, 403);
        }

        const subscription = rows[0];
        const today = new Date();
        const periodEnd = new Date(subscription.current_period_end);

        // Give a 3-day grace period
        const gracePeriodEnd = new Date(periodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
            return sendError(res, `Subscription is ${subscription.status}. Please renew your plan based on current usage.`, null, 403);
        }

        if (today > gracePeriodEnd) {
            // Auto-update to past due or suspend in a real job, but intercept here
            return sendError(res, 'Subscription has expired. Payment is required to continue using the system.', { expired_at: periodEnd }, 402); // 402 Payment Required
        }

        // Attach subscription features to request for downstream checks
        req.subscriptionFeatures = {
            apiAccess: subscription.has_api_access === 1,
            advancedReports: subscription.has_advanced_reports === 1,
            multiWarehouse: subscription.has_multi_warehouse === 1,
            mobileMoney: subscription.has_mobile_money === 1
        };

        next();
    } catch (error) {
        console.error('Subscription Guard Error:', error);
        sendError(res, 'Error verifying subscription status', null, 500);
    }
};

module.exports = subscriptionGuard;
