const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'multi_tenant_pos',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Helper for tenant-aware queries
const queryWithTenant = async (tenantId, sql, params = []) => {
  if (!tenantId) {
    throw new Error('tenant_id is required for this query');
  }
  
  // Inject tenant_id validation logic or appending depending on custom ORM wrapper
  // In our models, we will safely pass tenantId as the first param mostly.
  return await pool.query(sql, params);
};

// Simple query wrapper
const query = async (sql, params = []) => {
  return await pool.query(sql, params);
};

// Transaction wrapper
const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  queryWithTenant,
  withTransaction
};
