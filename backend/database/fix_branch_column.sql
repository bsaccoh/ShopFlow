-- Fix missing branch_id column in users table
-- Run this if you get "column u.branch_id does not exist" error

-- Add branch_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE users ADD COLUMN branch_id BIGINT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_branch 
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
        
        -- Update existing users to have the main branch of their tenant
        UPDATE users u 
        SET branch_id = (
            SELECT id FROM branches b 
            WHERE b.tenant_id = u.tenant_id AND b.is_main = true 
            LIMIT 1
        )
        WHERE branch_id IS NULL;
        
        RAISE NOTICE 'branch_id column added and users updated';
    ELSE
        RAISE NOTICE 'branch_id column already exists';
    END IF;
END $$;
