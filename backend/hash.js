const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('SuperAdmin@2024!', 10);
console.log(hash);
