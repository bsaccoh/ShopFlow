async function test() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch('https://babah-pos-app.onrender.com/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@babahpos.com',
                password: 'SuperAdmin@2024!',
                isSuperAdmin: false
            }),
            signal: controller.signal
        });
        const data = await res.json();
        clearTimeout(timeout);
        console.log('STATUS:', res.status);
        console.log('DATA:', data);
    } catch (err) {
        console.error('ERROR:', err);
    }
}
test();
