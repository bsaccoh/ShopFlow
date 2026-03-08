const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'multi_tenant_pos',
  port: process.env.DB_PORT || 5432,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Render and other managed Postgres often require SSL in production
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Create connection pool
const pool = new Pool(poolConfig);

/**
 * Translates MySQL '?' parameters to PostgreSQL '$1, $2' parameters.
 * Also appends 'RETURNING id' for INSERT operations to match MySQL's insertId behavior.
 */
function translateQuery(sql) {
  let translatedCount = 1;
  let pgSql = sql.replace(/\?/g, () => `$${translatedCount++}`);

  // If it's an insert, PostgreSQL doesn't return the ID by default.
  // Try to append RETURNING id if it doesn't exist and it's an INSERT.
  if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
    pgSql = `${pgSql} RETURNING id`;
  }

  return pgSql;
}

/**
 * Formats pg results to look like mysql2 results [rows, fields]
 */
function formatResult(result) {
  if (result.command === 'INSERT') {
    const insertId = result.rows.length > 0 ? result.rows[0].id : null;
    return [result.rows, { insertId, affectedRows: result.rowCount }];
  }
  if (result.command === 'UPDATE' || result.command === 'DELETE') {
    return [result.rows, { affectedRows: result.rowCount }];
  }
  // SELECT
  return [result.rows, result.fields];
}

// Simple query wrapper
const query = async (sql, params = []) => {
  const pgSql = translateQuery(sql);
  const result = await pool.query(pgSql, params);
  return formatResult(result);
};

// Helper for tenant-aware queries
const queryWithTenant = async (tenantId, sql, params = []) => {
  if (!tenantId) {
    throw new Error('tenant_id is required for this query');
  }
  const pgSql = translateQuery(sql);
  const result = await pool.query(pgSql, params);
  return formatResult(result);
};

// Transaction wrapper
const withTransaction = async (callback) => {
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    // We pass a mock connection object that translates queries inside the callback
    const dbClient = {
      query: async (sql, params = []) => {
        const pgSql = translateQuery(sql);
        const result = await client.query(pgSql, params);
        return formatResult(result);
      }
    };
    const result = await callback(dbClient);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  queryWithTenant,
  withTransaction
};
