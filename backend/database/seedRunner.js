const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSeed() {
    console.log('Starting Database Seeding...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'multi_tenant_pos',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected to Database.');

        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        console.log('Executing seed data...');
        await connection.query(seedSql);

        console.log('Seed data inserted successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

runSeed();
