const fs = require('fs');
const path = require('path');

try {
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    let sql = fs.readFileSync(seedPath, 'utf8');

    // Replace all instances of INSERT IGNORE INTO -> INSERT INTO
    sql = sql.replace(/INSERT IGNORE INTO /g, 'INSERT INTO ');

    // In postgres, ON CONFLICT DO NOTHING must specify a conflict target in some versions.
    // E.g., ON CONFLICT (id) DO NOTHING.
    // Since it's a seed script running on an empty DB, we can just remove ON CONFLICT DO NOTHING 
    // because we don't expect conflicts on a fresh DB. The previous refactor appended it.
    sql = sql.replace(/\) ON CONFLICT DO NOTHING;/g, ');');

    fs.writeFileSync(seedPath, sql, 'utf8');
    console.log('Successfully patched seed.sql to standard INSERT statements.');
} catch (e) {
    console.error(e);
}
