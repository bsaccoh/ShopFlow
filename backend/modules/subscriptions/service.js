const { query } = require('../../database/connection');

const getTenantSubscription = async (tenantId) => {
  const [rows] = await query(`
    SELECT s.status, s.billing_cycle, s.current_period_start, s.current_period_end, s.trial_ends_at,
           p.name as plan_name, p.max_users, p.max_products, p.has_mobile_money
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.tenant_id = ? 
    ORDER BY s.id DESC LIMIT 1
  `, [tenantId]);

  return rows[0] || null;
};

const getPlans = async () => {
  const [rows] = await query(`
    SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC
  `);
  return rows;
};

module.exports = {
  getTenantSubscription,
  getPlans
};
