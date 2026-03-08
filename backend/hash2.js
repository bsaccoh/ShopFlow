const bcrypt = require('bcryptjs');
console.log("Super Admin (SuperAdmin@2024!):", bcrypt.hashSync('SuperAdmin@2024!', 10));
console.log("Tenant (Password123!):", bcrypt.hashSync('Password123!', 10));
