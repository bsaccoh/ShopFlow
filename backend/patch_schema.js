const fs = require('fs');
const path = require('path');

try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Postgres requires explicit boolean defaults
    sql = sql.replace(/BOOLEAN DEFAULT 1/g, 'BOOLEAN DEFAULT TRUE');
    sql = sql.replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE');

    // Also check for tinyint(1) default 1/0
    // And in seed.sql
    fs.writeFileSync(schemaPath, sql, 'utf8');

    // Check seed.sql for any TINYINT defaults just in case, though it's usually just VALUES (1, ...) which PG can sometimes cast,
    // but better to leave it unless it errors. PG can cast integer 1 to boolean true in INSERTs if the value is literal, but strictly true/false is better.
    console.log('Patched schema.sql boolean defaults.');
} catch (e) {
    console.error(e);
}
