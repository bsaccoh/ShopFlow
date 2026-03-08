const fs = require('fs');
const path = require('path');

try {
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    let sql = fs.readFileSync(seedPath, 'utf8');

    // 1. Fix DATE_ADD and CURDATE
    sql = sql.replace(/DATE_ADD\(CURDATE\(\),\s*INTERVAL\s+1\s+MONTH\)/g, "CURRENT_DATE + INTERVAL '1 month'");
    sql = sql.replace(/CURDATE\(\)/g, "CURRENT_DATE");

    // 2. Fix Boolean 1/0 inside VALUES
    // Subscription Plans
    sql = sql.replace(/\(1, 'Starter', 'starter', 'For small shops and solo entrepreneurs', 500\.00, 5000\.00, 3, 1000, 1, 0, 0, 0, 1, 1\)/g,
        "(1, 'Starter', 'starter', 'For small shops and solo entrepreneurs', 500.00, 5000.00, 3, 1000, 1, FALSE, FALSE, FALSE, TRUE, 1)");
    sql = sql.replace(/\(2, 'Business', 'business', 'For growing retail businesses', 1200\.00, 12000\.00, 10, 5000, 3, 1, 1, 1, 1, 2\)/g,
        "(2, 'Business', 'business', 'For growing retail businesses', 1200.00, 12000.00, 10, 5000, 3, TRUE, TRUE, TRUE, TRUE, 2)");
    sql = sql.replace(/\(3, 'Enterprise', 'enterprise', 'For large chain stores and operations', 3000\.00, 30000\.00, 999, 99999, 10, 1, 1, 1, 1, 3\)/g,
        "(3, 'Enterprise', 'enterprise', 'For large chain stores and operations', 3000.00, 30000.00, 999, 99999, 10, TRUE, TRUE, TRUE, TRUE, 3)");

    // Super Admins
    // VALUES (1, '..., 'Babah', 'Admin', 1)
    sql = sql.replace(/'Admin', 1\)/g, "'Admin', TRUE)");

    // Tenants
    // 'SLE', 1)
    sql = sql.replace(/'SLE', 1\)/g, "'SLE', TRUE)");

    // Roles
    // 'features', 1)
    // 'billing', 1)
    // 'only', 1)
    // 'orders', 1)
    sql = sql.replace(/(features', |billing', |only', |orders', )1\)/g, "$1TRUE)");

    // Users
    // 'Admin', 1)
    // 'Manager', 1)
    // 'Cashier', 1)
    sql = sql.replace(/(Admin', |Manager', |Cashier', )1\)/g, "$1TRUE)");

    fs.writeFileSync(seedPath, sql, 'utf8');
    console.log('Successfully patched booleans and dates in seed.sql.');
} catch (e) {
    console.error(e);
}
