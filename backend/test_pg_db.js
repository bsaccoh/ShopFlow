const { query } = require('./database/connection');

async function testConnection() {
    try {
        console.log('Testing PostgreSQL connection...');
        const [rows] = await query('SELECT 1 as val, current_database() as db, current_user as usr');
        console.log('Connection successful!');
        console.log('Result:', rows[0]);
        process.exit(0);
    } catch (e) {
        console.error('Connection failed:', e);
        process.exit(1);
    }
}

testConnection();
