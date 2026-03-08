const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    console.log('Starting Database Initialization...');
    try {
        // Connect without database selected to create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected to MySQL server.');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await connection.query(schemaSql);

        console.log('Database and tables created successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
