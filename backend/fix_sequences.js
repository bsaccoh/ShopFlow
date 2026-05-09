const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'multi_tenant_pos',
    port: process.env.DB_PORT || 5432,
});

(async () => {
    const client = await pool.connect();
    try {
        const tables = [
            'super_admins', 'tenants', 'branches', 'subscription_plans', 'subscriptions',
            'roles', 'users', 'categories', 'suppliers', 'products', 'customers',
            'inventory', 'inventory_movements', 'sales', 'sale_items', 'payments',
            'purchases', 'purchase_items', 'returns', 'stock_adjustments', 'audit_logs',
            'loyalty_points', 'mobile_money_transactions', 'tenant_payment_configs',
            'purchase_orders', 'purchase_order_items', 'return_items', 'discounts',
            'expenses', 'cash_register_sessions', 'store_settings', 'customer_credits',
            'tax_config', 'system_settings', 'feature_flags', 'permissions'
        ];

        for (const table of tables) {
            try {
                const seqName = `${table}_id_seq`;
                const result = await client.query(
                    `SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM ${table}), 1))`
                );
                const maxId = await client.query(`SELECT MAX(id) as max_id FROM ${table}`);
                console.log(`✅ Fixed: ${table} (max ID: ${maxId.rows[0].max_id}, sequence reset)`);
            } catch (e) {
                console.log(`⏭️  Skip: ${table} - ${e.message.substring(0, 80)}`);
            }
        }

        console.log('\n🎉 All sequences have been reset!');
    } catch (e) {
        console.error('Fatal:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
})();
