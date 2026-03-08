const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugSaleQuery() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root123',
        database: process.env.DB_NAME || 'multi_tenant_pos',
        port: process.env.DB_PORT || 3306,
    });

    const tenantId = 4;
    const productId = 11;
    const preferredWarehouse = 'Main Store';

    console.log(`Testing with tenantId=${tenantId}, productId=${productId}, warehouse=${preferredWarehouse}`);

    const [invRows] = await pool.query(`
      SELECT id, warehouse, quantity
      FROM inventory
      WHERE tenant_id = ? AND product_id = ? AND warehouse IN (?, 'main')
      ORDER BY CASE
          WHEN warehouse = ? THEN 0
          WHEN warehouse = 'main' THEN 1
          ELSE 2
      END
      LIMIT 1
  `, [tenantId, productId, preferredWarehouse, preferredWarehouse]);

    console.log('invRows returned:', JSON.stringify(invRows, null, 2));

    await pool.end();
}

debugSaleQuery().catch(console.error);
