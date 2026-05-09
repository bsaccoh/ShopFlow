const bcrypt = require('bcryptjs');
const { query } = require('./database/connection');

async function fixPasswords() {
    const password = 'Password123!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('New hash for Password123!:', hash);
    
    // Update all demo users
    await query("UPDATE users SET password_hash = ? WHERE email IN ('admin@demoshop.com', 'manager@demoshop.com', 'cashier@demoshop.com')", [hash]);
    
    console.log('Passwords updated for demo users');
    process.exit(0);
}

fixPasswords().catch(e => {
    console.error(e);
    process.exit(1);
});
