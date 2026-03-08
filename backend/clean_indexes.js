const fs = require('fs');
const path = require('path');

try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Array to hold the CREATE INDEX statements
    let indexes = [];

    // 1. Extract and remove all INDEX idx_... (...) lines inside CREATE TABLE blocks
    // This regex looks for ", [whitespace] INDEX indexName (columns)" and removes it while capturing necessary parts
    // But we need the table name. A better approach is to parse table by table.

    const tablesRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g;
    let newSql = sql;

    let match;
    while ((match = tablesRegex.exec(sql)) !== null) {
        const tableName = match[1];
        let tableBody = match[2];

        // Find lines that start with INDEX
        const lines = tableBody.split(/\r?\n/);
        const newLines = [];

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('INDEX ')) {
                // remove trailing comma if any
                const idxStr = trimmed.replace(/,$/, '');
                // It looks like `INDEX idx_name (col1, col2)`
                // We convert it to `CREATE INDEX IF NOT EXISTS idx_name ON tableName (col1, col2);`
                const idxMatch = idxStr.match(/^INDEX\s+(\w+)\s+\(([^)]+)\)/i);
                if (idxMatch) {
                    indexes.push(`CREATE INDEX IF NOT EXISTS ${idxMatch[1]} ON ${tableName} (${idxMatch[2]});`);
                }
            } else {
                newLines.push(line);
            }
        }

        // Join back the lines
        let newTableBody = newLines.join('\n');

        // The last line inside the body might have a trailing comma now if the index was removed from the end.
        // We clean up any trailing comma before the closing parenthesis.
        newTableBody = newTableBody.replace(/,\s*$/, '\n');

        // Replace in newSql
        newSql = newSql.replace(match[0], `CREATE TABLE IF NOT EXISTS ${tableName} (${newTableBody});`);
    }

    // Append standalone indexes
    newSql += '\n\n-- ============================================\n';
    newSql += '-- POSTGRESQL INDEXES\n';
    newSql += '-- ============================================\n\n';
    newSql += indexes.join('\n');

    fs.writeFileSync(schemaPath, newSql, 'utf8');
    console.log(`Extracted ${indexes.length} indexes and patched schema.sql successfully.`);
} catch (e) {
    console.error(e);
}
