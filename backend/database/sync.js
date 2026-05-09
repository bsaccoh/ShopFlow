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
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS customer_id BIGINT');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(14,2) DEFAULT 0');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50) DEFAULT \'CASH\'');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS processed_by BIGINT');
        await query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP');

        // 3. Fix Users table - add missing branch_id column
        console.log('  → Adding branch_id to users table...');
        await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id BIGINT');
        console.log('  → branch_id column added or already exists');
        
        // Add foreign key if it doesn't exist
        try {
            await query('ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL');
            console.log('  → Foreign key added');
        } catch (e) {
            console.log('  → Foreign key already exists or skipped');
        }

        console.log('✅ Database schema sync completed.');
    } catch (error) {
        console.error('❌ Database schema sync failed:', error.message);
    }
}

module.exports = { syncDatabase };
