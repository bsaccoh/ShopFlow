const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.error('.env file not found!');
    process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Generate cryptographically secure keys
const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

// ENCRYPTION_KEY must be exactly 32 characters for aes-256-cbc (32 bytes when using Buffer.from)
// ENCRYPTION_IV must be exactly 16 characters for aes-256-cbc
const encryptionKey = crypto.randomBytes(16).toString('hex'); // 32 hex chars
const encryptionIv = crypto.randomBytes(8).toString('hex'); // 16 hex chars

const pass = crypto.randomBytes(8).toString('hex');
const superAdminPass = `ShopFlow@${pass}!`;

// Replace in content
envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
envContent = envContent.replace(/JWT_REFRESH_SECRET=.*/g, `JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
envContent = envContent.replace(/ENCRYPTION_KEY=.*/g, `ENCRYPTION_KEY=${encryptionKey}`);
envContent = envContent.replace(/ENCRYPTION_IV=.*/g, `ENCRYPTION_IV=${encryptionIv}`);
envContent = envContent.replace(/SUPER_ADMIN_PASSWORD=.*/g, `SUPER_ADMIN_PASSWORD=${superAdminPass}`);
envContent = envContent.replace(/CORS_ORIGIN=.*/g, `CORS_ORIGIN=https://pos.babahpos.com`); // Production domain example
envContent = envContent.replace(/LOG_LEVEL=.*/g, `LOG_LEVEL=info`);

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('Successfully secured .env file constants.');
console.log(`New Super Admin Password: ${superAdminPass}`);
