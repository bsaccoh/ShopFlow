const jwt = require('jsonwebtoken');

const payload = {
    id: 1,
    email: 'admin@babahpos.com',
    isSuperAdmin: true,
    role: 'super_admin'
};

const token = jwt.sign(payload, 'secret', { expiresIn: '1h' });
const decoded = jwt.verify(token, 'secret');

console.log(decoded);
