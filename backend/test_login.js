const authService = require('./modules/auth/service');

async function testLogin() {
    console.log("Testing Super Admin Login...");
    try {
        const result = await authService.authenticateUser('admin@babahpos.com', 'SuperAdmin@2024!', true);
        console.log("Super Admin Login Result:", Object.keys(result));
        console.log("Success!");
    } catch (e) {
        console.error("Super Admin Login failed:", e.message);
    }

    console.log("\nTesting Tenant Admin Login...");
    try {
        const result = await authService.authenticateUser('admin@demoshop.com', 'Password123!', false);
        console.log("Tenant Admin Login Result:", Object.keys(result));
        console.log("Success!");
    } catch (e) {
        console.error("Tenant Admin Login failed:", e.message);
    }

    process.exit(0);
}

testLogin();
