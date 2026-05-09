async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('https://babah-pos-app.onrender.com/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@babahpos.com',
                password: 'SuperAdmin@2024!',
                isSuperAdmin: true
            })
        });

        if (!loginRes.ok) throw new Error('Login failed: ' + await loginRes.text());

        const loginData = await loginRes.json();
        const token = loginData.data.token;

        console.log('Registering tenant...');
        const regRes = await fetch('https://babah-pos-app.onrender.com/api/v1/auth/register-tenant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                tenantName: 'EIE Enterprise Test',
                firstName: 'Adaobi',
                lastName: 'Ilono',
                email: 'ada.test999@gmail.com',
                phone: '+23276450998',
                password: 'Password123!',
                planId: 1,
                billingCycle: 'MONTHLY'
            })
        });

        const regData = await regRes.json();
        console.log('STATUS:', regRes.status);
        console.log('DATA:', JSON.stringify(regData, null, 2));

    } catch (err) {
        console.error('ERROR:', err);
    }
}
test();
