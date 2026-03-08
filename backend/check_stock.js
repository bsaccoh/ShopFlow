const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStock() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root123',
        database: process.env.DB_NAME || 'multi_tenant_pos',
        port: process.env.DB_PORT || 3306,
    });

    const [products] = await pool.query("SELECT id, name, tenant_id FROM products WHERE name LIKE '%Bison%'");
    console.log('Products found:', JSON.stringify(products, null, 2));

    if (products.length > 0) {
        const productIds = products.map(p => p.id);
        const [inventory] = await pool.query("SELECT * FROM inventory WHERE product_id IN (?)", [productIds]);
        console.log('Inventory:', JSON.stringify(inventory, null, 2));

        const [branches] = await pool.query("SELECT * FROM branches WHERE tenant_id = ?", [products[0].tenant_id]);
        console.log('Branches:', JSON.stringify(branches, null, 2));

        const [users] = await pool.query("SELECT id, email, tenant_id, branch_id FROM users WHERE tenant_id = ?", [products[0].tenant_id]);
        console.log('Users:', JSON.stringify(users, null, 2));
    }

    await pool.end();
}

checkStock().catch(console.error);
