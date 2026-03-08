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

    console.log('Creating branches and branch_transfers tables...');

    await connection.query(`
        CREATE TABLE IF NOT EXISTS branches (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            name VARCHAR(100) NOT NULL,
            address TEXT,
            phone VARCHAR(50),
            is_main TINYINT(1) DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS branch_transfers (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            from_branch BIGINT NOT NULL,
            to_branch BIGINT NOT NULL,
            status ENUM('PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
            items JSON NOT NULL,
            created_by BIGINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (from_branch) REFERENCES branches(id) ON DELETE CASCADE,
            FOREIGN KEY (to_branch) REFERENCES branches(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
    `);

    // Ensure main branch exists for all tenants with main warehouse inventory
    const [tenants] = await connection.query('SELECT id FROM tenants');
    for (const t of tenants) {
        const [existing] = await connection.query('SELECT id FROM branches WHERE tenant_id = ? AND is_main = 1', [t.id]);
        if (existing.length === 0) {
            await connection.query('INSERT INTO branches (tenant_id, name, is_main, is_active) VALUES (?, "main", 1, 1)', [t.id]);
        }
    }

    console.log('Tables created and default branches seeded successfully!');
    await connection.end();
}

setup().catch(console.error);
