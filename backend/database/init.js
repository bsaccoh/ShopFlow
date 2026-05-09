const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
    console.log('Starting Database Initialization...');
    try {
        // Connect without database selected to create it if it doesn't exist
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 5432,
            database: 'postgres' // Connect to default postgres db first
        });

        console.log('Connected to PostgreSQL server.');

        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'multi_tenant_pos';
        await pool.query(`CREATE DATABASE ${dbName} IF NOT EXISTS`);
        
        console.log(`Database ${dbName} ready.`);
        await pool.end();
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
