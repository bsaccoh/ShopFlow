const fs = require('fs');
const path = require('path');

function patchSchema() {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // 1. Add Branches Table
    const branchesTable = `
CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  location TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
`;

    // Insert right after tenants table
    sql = sql.replace(/\);(\s+)CREATE TABLE IF NOT EXISTS subscription_plans/, `);$1${branchesTable}$1CREATE TABLE IF NOT EXISTS subscription_plans`);

    // 2. Add branch_id to users
    // role_id BIGINT NULL,
    sql = sql.replace(/role_id BIGINT NULL,/g, 'role_id BIGINT NULL,\n  branch_id BIGINT NULL,');

    // 3. Add branch_id to sales
    // user_id BIGINT NOT NULL,
    sql = sql.replace(/user_id BIGINT NOT NULL,/g, 'user_id BIGINT NOT NULL,\n  branch_id BIGINT NULL,');

    // Add indexes for branches
    const indexAdditions = `
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches (tenant_id);
`;
    sql += indexAdditions;

    fs.writeFileSync(schemaPath, sql, 'utf8');
    console.log('Schema patched successfully.');
}

function patchSeed() {
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    let sql = fs.readFileSync(seedPath, 'utf8');

    // Add branch seed data after roles
    const branchesSeed = `
-- 5.5 Create Main Branch
INSERT INTO branches (id, tenant_id, name, is_main, is_active) VALUES
(1, 1, 'Main Branch', TRUE, TRUE);
`;

    sql = sql.replace(/-- 6\. Create Demo Users for Demo Tenant/g, branchesSeed + '\n-- 6. Create Demo Users for Demo Tenant');

    // Update Users seed to include branch_id
    sql = sql.replace(/\(id, tenant_id, role_id, email/g, '(id, tenant_id, role_id, branch_id, email');

    // (1, 1, 1, 'admin
    sql = sql.replace(/\(1, 1, 1, 'admin/g, '(1, 1, 1, 1, \'admin');
    sql = sql.replace(/\(2, 1, 2, 'manager/g, '(2, 1, 2, 1, \'manager');
    sql = sql.replace(/\(3, 1, 3, 'cashier/g, '(3, 1, 3, 1, \'cashier');

    fs.writeFileSync(seedPath, sql, 'utf8');
    console.log('Seed patched successfully.');
}

patchSchema();
patchSeed();
