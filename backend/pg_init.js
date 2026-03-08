const fs = require('fs');
const path = require('path');
const { pool } = require('./database/connection');

async function initializeDb() {
    try {
        console.log('Connecting to Postgres to deploy schema and seed...');

        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await pool.query(schemaSql);
        console.log('Schema deployed successfully.');

        const seedPath = path.join(__dirname, 'database', 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        console.log('Running seed.sql...');
        await pool.query(seedSql);
        console.log('Seed deployed successfully.');

        console.log('Database initialized successfully in PostgreSQL!');
        // Delete this script after execution to clean up
        process.exit(0);

    } catch (e) {
        console.error('Database Initialization Failed:', e);
        process.exit(1);
    }
}

initializeDb();
