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
        // Check if branch_id exists on the sales table
        const check = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'sales' AND column_name = 'branch_id'
        `);

        if (check.rows.length === 0) {
            console.log('❌ branch_id column is MISSING from sales table. Adding it now...');
            await client.query(`ALTER TABLE sales ADD COLUMN branch_id BIGINT NULL`);
            console.log('✅ branch_id column added to sales table.');
        } else {
            console.log('✅ branch_id column already exists on sales table.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
})();
