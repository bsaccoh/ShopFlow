const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updateSeed() {
    try {
        const seedPath = path.join(__dirname, 'database', 'seed.sql');
        let seedData = fs.readFileSync(seedPath, 'utf8');

        // Extract the super admin pass from .env
        const newPass = process.env.SUPER_ADMIN_PASSWORD;
        if (!newPass) throw new Error("SUPER_ADMIN_PASSWORD not found in .env");

        const hash = await bcrypt.hash(newPass, 10);

        // Replace the old bcrypt hash with the new one
        seedData = seedData.replace(/\$2y\$10\$w\/A2cIeQ7VwB6D\.K1l5P8u9b0Lg8V2fH6ZxC3P9H8O\/L7Kq3x5EGy/g, hash);

        // Remove the demo categories, products, sales, etc keeping only the base tenants/users
        const categoryIndex = seedData.indexOf('-- 7. Add Categories');
        if (categoryIndex > -1) {
            seedData = seedData.substring(0, categoryIndex);
        }

        fs.writeFileSync(seedPath, seedData, 'utf8');
        console.log('Successfully updated seed.sql to use secure password and remove demo transactions (for Docker initialization).');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateSeed();
