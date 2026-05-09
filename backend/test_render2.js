const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('https://babah-pos-app.onrender.com/api/v1/auth/login', {
            email: 'admin@babahpos.com',
            password: 'SuperAdmin@2024!',
            isSuperAdmin: false
        });
        console.log('SUCCESS:', res.data);
    } catch (err) {
        if (err.response) {
            console.error('ERROR DATA:', err.response.data);
        } else {
            console.error('ERROR:', err.message);
        }
    }
}
test();
