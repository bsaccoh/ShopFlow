require('dotenv').config();
const mysql = require('mysql2/promise');

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root123',
        database: process.env.DB_NAME || 'multi_tenant_pos',
        multipleStatements: true
    });

    console.log('Adding branch_id to users table...');

    try {
        await connection.query(`
            ALTER TABLE users 
            ADD COLUMN branch_id BIGINT NULL AFTER role_id,
            ADD CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
        `);
        console.log('Column branch_id successfully added to users table.');
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column branch_id already exists.');
        } else {
            throw error;
        }
    }

    // Assign existing users to the main branch of their tenant if they don't have one
    console.log('Assigning existing users to their main branch...');
    const [tenants] = await connection.query('SELECT id FROM tenants');
    for (const t of tenants) {
        const [mainBranch] = await connection.query('SELECT id FROM branches WHERE tenant_id = ? AND is_main = 1 LIMIT 1', [t.id]);
        if (mainBranch.length > 0) {
            await connection.query('UPDATE users SET branch_id = ? WHERE tenant_id = ? AND branch_id IS NULL', [mainBranch[0].id, t.id]);
        }
    }

    console.log('Users assigned to main branches successfully!');
    await connection.end();
}

setup().catch(console.error);
