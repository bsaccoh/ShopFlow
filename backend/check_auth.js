const { query } = require('./database/connection');

async function checkAuth() {
    try {
        console.log('\n--- SUPER ADMINS ---');
        const [superAdmins] = await query('SELECT id, email, is_active FROM super_admins');
        console.log(superAdmins);

        console.log('\n--- TENANTS ---');
        const [tenants] = await query('SELECT id, name, is_active FROM tenants');
        console.log(tenants);

        console.log('\n--- USERS ---');
        const [users] = await query('SELECT id, tenant_id, email, is_active FROM users');
        console.log(users);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAuth();
