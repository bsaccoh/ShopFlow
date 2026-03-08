const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Convert DATE_FORMAT(..., '%Y-%m') -> TO_CHAR(..., 'YYYY-MM')
    if (content.includes('DATE_FORMAT')) {
        content = content.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m'\)/g, "TO_CHAR($1, 'YYYY-MM')");
        content = content.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/g, "TO_CHAR($1, 'YYYY-MM-DD')");
        // Convert DATE_FORMAT(CURDATE(), ...) to TO_CHAR(CURRENT_DATE, ...)
        content = content.replace(/DATE_FORMAT\(CURDATE\(\),\s*'%Y-%m-01'\)/g, "TO_CHAR(CURRENT_DATE, 'YYYY-MM-01')");
        content = content.replace(/DATE_FORMAT\(([^,]+),\s*\?\)/g, "TO_CHAR($1, ?)");
        hasChanges = true;
    }

    // Convert DATE_SUB(..., INTERVAL X MONTH) -> ... - INTERVAL 'X months'
    if (content.includes('DATE_SUB')) {
        content = content.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+MONTH\)/g, "$1 - INTERVAL '$2 months'");
        content = content.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/g, "$1 - INTERVAL '$2 days'");
        hasChanges = true;
    }

    // Convert CURDATE() -> CURRENT_DATE
    if (content.includes('CURDATE()')) {
        content = content.replace(/CURDATE\(\)/g, "CURRENT_DATE");
        hasChanges = true;
    }

    if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js')) {
            replaceInFile(fullPath);
        }
    }
}

// 1. Process Controllers
processDirectory(path.join(__dirname, 'modules'));

// 2. Process seed.sql
const seedPath = path.join(__dirname, 'database', 'seed.sql');
if (fs.existsSync(seedPath)) {
    let seedSql = fs.readFileSync(seedPath, 'utf8');
    // For standard Postgres without primary key conflict target, ON CONFLICT DO NOTHING requires a constraint target for some tables, 
    // but standard INSERT IGNORE equivalent is typically just catching exceptions or using standard syntax if no conflict is expected.
    // Given seed.sql inserts to specific IDs, ON CONFLICT DO NOTHING works if we supply the constraint (id).
    // A quick hack for a clean DB is we don't even need ON CONFLICT if it's a fresh DB.
    // I will replace INSERT IGNORE INTO with INSERT INTO and append ON CONFLICT DO NOTHING.
    seedSql = seedSql.replace(/INSERT IGNORE INTO ([a-z_]+) \(([^)]+)\) VALUES\s*\n?/g, 'INSERT INTO $1 ($2) VALUES\n');
    seedSql = seedSql.replace(/INSERT IGNORE INTO ([a-z_]+) \(([^)]+)\)\nVALUES\s*\n?/g, 'INSERT INTO $1 ($2) VALUES\n');

    // Add ON CONFLICT DO NOTHING at the end of every values block if needed.
    // Currently seed.sql ends lines with `);`
    seedSql = seedSql.replace(/\);\n/g, ') ON CONFLICT DO NOTHING;\n');

    fs.writeFileSync(seedPath, seedSql, 'utf8');
    console.log(`Updated ${seedPath}`);
}
