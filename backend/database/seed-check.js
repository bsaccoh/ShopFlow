const { query } = require('./connection');
const bcrypt = require('bcryptjs');

async function ensureSeedData() {
    console.log('Checking if seed data exists...');
    
    try {
        // Check if demo user exists
        const [users] = await query('SELECT * FROM users WHERE email = ?', ['admin@demoshop.com']);
        
        if (users.length === 0) {
            console.log('Demo user not found. Inserting seed data...');
            
            // Insert subscription plans
            await query(`
                INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_users, max_products, max_branches, has_api_access, has_advanced_reports, has_multi_warehouse, has_mobile_money, sort_order) 
                VALUES 
                (1, 'Starter', 'starter', 'For small shops and solo entrepreneurs', 500.00, 5000.00, 3, 1000, 1, FALSE, FALSE, FALSE, TRUE, 1),
                (2, 'Business', 'business', 'For growing retail businesses', 1200.00, 12000.00, 10, 5000, 3, TRUE, TRUE, TRUE, TRUE, 2),
                (3, 'Enterprise', 'enterprise', 'For large chain stores and operations', 3000.00, 30000.00, 999, 99999, 10, TRUE, TRUE, TRUE, TRUE, 3)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Subscription plans inserted');
            
            // Insert demo tenant
            await query(`
                INSERT INTO tenants (id, name, slug, email, phone, address, city, currency, is_active) 
                VALUES (1, 'Demo Shop Retail', 'demo-shop', 'demo@demoshop.com', '+23277000000', '123 Siaka Stevens St', 'Freetown', 'SLE', TRUE)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Demo tenant inserted');
            
            // Insert subscription for demo tenant
            await query(`
                INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end)
                VALUES (1, 1, 2, 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month')
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Subscription inserted');
            
            // Insert roles
            await query(`
                INSERT INTO roles (id, tenant_id, name, slug, description, is_system) VALUES
                (1, 1, 'Administrator', 'admin', 'Full access to all features', TRUE),
                (2, 1, 'Manager', 'manager', 'Access to mostly everything except billing', TRUE),
                (3, 1, 'Cashier', 'cashier', 'Access to POS and Sales only', TRUE),
                (4, 1, 'Inventory Manager', 'inventory_manager', 'Access to products, inventory, suppliers, and purchase orders', TRUE)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Roles inserted');
            
            // Insert main branch
            await query(`
                INSERT INTO branches (id, tenant_id, name, is_main, is_active) 
                VALUES (1, 1, 'Main Branch', TRUE, TRUE)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Branch inserted');
            
            // Insert demo users with password: Password123!
            const passwordHash = '$2a$10$MAgAZnIlqtZEFQx3ihncI.htYvi9.B6UTIUiJOO58dCESSOF4SMC2';
            await query(`
                INSERT INTO users (id, tenant_id, role_id, branch_id, email, password_hash, first_name, last_name, is_active) VALUES
                (1, 1, 1, 1, 'admin@demoshop.com', '${passwordHash}', 'Demo', 'Admin', TRUE),
                (2, 1, 2, 1, 'manager@demoshop.com', '${passwordHash}', 'Store', 'Manager', TRUE),
                (3, 1, 3, 1, 'cashier@demoshop.com', '${passwordHash}', 'Point', 'Cashier', TRUE)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Demo users inserted');
            
            // Update sequences
            await query("SELECT setval('subscription_plans_id_seq', (SELECT MAX(id) FROM subscription_plans))");
            await query("SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants))");
            await query("SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions))");
            await query("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))");
            await query("SELECT setval('branches_id_seq', (SELECT MAX(id) FROM branches))");
            await query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
            console.log('✓ Sequences updated');
            
            console.log('✅ Seed data inserted successfully!');
        } else {
            console.log('✅ Demo user already exists');
            console.log('User details:', users[0].email, 'is_active:', users[0].is_active);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

ensureSeedData();
