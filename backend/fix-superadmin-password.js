const bcrypt = require('bcryptjs');
const { query } = require('./database/connection');

async function fixSuperAdminPassword() {
    const password = 'SuperAdmin@2024!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('New hash for SuperAdmin@2024!:', hash);
    
    // Update superadmin password
    await query("UPDATE super_admins SET password_hash = ? WHERE email = 'admin@babahpos.com'", [hash]);
    
    console.log('SuperAdmin password updated');
    process.exit(0);
}

fixSuperAdminPassword().catch(e => {
    console.error(e);
    process.exit(1);
});
