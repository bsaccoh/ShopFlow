async function test() {
    try {
        const res = await fetch('https://babah-pos-app.onrender.com/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@babahpos.com',
                password: 'SuperAdmin@2024!',
                isSuperAdmin: false
            })
        });
        const data = await res.json();
        console.log('STATUS:', res.status);
        console.log('DATA:', data);
    } catch (err) {
        console.error('ERROR:', err);
    }
}
test();
