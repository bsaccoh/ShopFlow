const { query } = require('./connection');

/**
 * Automatically syncs the database schema by adding missing columns.
 * This is useful for environments like Render where manual DB access is limited.
 */
async function syncDatabase() {
    console.log('🔄 Checking database schema for missing columns...');
    try {
        // 1. Fix Suppliers table (Missing 'notes' and 'city')
        await query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT');
        await query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100)');

        // 2. Fix Returns table (Standardizing columns from the consolidation)
        // Note: Postgres ALTER TABLE ADD COLUMN IF NOT EXISTS is idempotent
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS customer_id BIGINT');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(14,2) DEFAULT 0');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50) DEFAULT \'CASH\'');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS processed_by BIGINT');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP');

        console.log('✅ Database schema sync completed.');
    } catch (error) {
        console.error('❌ Database schema sync failed:', error.message);
        // We don't exit process here so the server can still try to start
    }
}

module.exports = { syncDatabase };
