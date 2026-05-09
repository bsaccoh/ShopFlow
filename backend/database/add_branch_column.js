const { query } = require('./connection');

async function addBranchColumn() {
    console.log('Adding branch_id column to users table...');
    try {
        // Check if column exists
        const [rows] = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'branch_id'
        `);
        
        if (rows.length === 0) {
            await query(`
                ALTER TABLE users 
                ADD COLUMN branch_id BIGINT NULL,
                ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
            `);
            console.log('✓ branch_id column added successfully');
            
            // Update existing users to have the main branch of their tenant
            await query(`
                UPDATE users u 
                SET branch_id = (
                    SELECT id FROM branches b 
                    WHERE b.tenant_id = u.tenant_id AND b.is_main = true 
                    LIMIT 1
                )
                WHERE branch_id IS NULL
            `);
            console.log('✓ Existing users updated with main branch');
        } else {
            console.log('branch_id column already exists');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addBranchColumn();
