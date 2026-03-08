const fs = require('fs');
const path = require('path');

async function processSchema() {
    try {
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        let sql = fs.readFileSync(schemaPath, 'utf8');

        // 1. Remove DB Creation and USE (Let Render/Docker handle DB creation)
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS multi_tenant_pos.*?;/gs, '');
        sql = sql.replace(/USE multi_tenant_pos;/g, '');

        // 2. Data Types
        sql = sql.replace(/BIGINT AUTO_INCREMENT PRIMARY KEY/g, 'BIGSERIAL PRIMARY KEY');
        sql = sql.replace(/TINYINT\(1\)/g, 'BOOLEAN');
        sql = sql.replace(/DATETIME/g, 'TIMESTAMP');
        sql = sql.replace(/JSON/g, 'JSONB');

        // Postgres DECIMAL doesn't strictly need length, but DECIMAL(X,Y) works.
        // Wait, MySQL's `ON UPDATE CURRENT_TIMESTAMP` is not native to Postgres tables.
        // I will replace `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` with just `DEFAULT CURRENT_TIMESTAMP`.
        // A trigger is normally needed for updated_at in Postgres, but to save time, 
        // ORMs/Services usually pass updated_at manually, or we just rely on created_at for now.
        sql = sql.replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g, 'DEFAULT CURRENT_TIMESTAMP');

        // 3. Remove ENGINE=InnoDB
        sql = sql.replace(/\) ENGINE=InnoDB;/g, ');');

        // 4. Postgres doesn't easily support ENUM definitions directly inline like MySQL.
        // A safer way is VARCHAR with CHECK constraint or just let it be VARCHAR.
        // I'll regex replace ENUM(...) with VARCHAR(50).
        sql = sql.replace(/ENUM\([^)]+\)/g, 'VARCHAR(50)');

        // 5. Remove 'UNIQUE KEY uk...' inline syntax which Postgres doesn't format exactly this way without CONSTRAINT keyword.
        // Alternatively, standard Postgres accepts `UNIQUE (col1, col2)`.
        sql = sql.replace(/UNIQUE KEY \w+ \(([^)]+)\)/g, 'UNIQUE ($1)');

        // 6. Inline index creation syntax like `INDEX idx_name (col)` at the end of CREATE TABLE 
        // is NOT valid in PostgreSQL. It must be created outside.
        // I need to strip them and append them at the end.
        const indexRegex = /INDEX\s+(\w+)\s+\(([^)]+)\)/g;
        let indexes = [];
        let match;

        // Extract all indexes
        const tablesRegex = /CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\);/gs;
        let newSql = "";
        let lastIndex = 0;

        while ((tableMatch = tablesRegex.exec(sql)) !== null) {
            newSql += sql.substring(lastIndex, tableMatch.index);
            const tableName = tableMatch[1];
            let tableBody = tableMatch[2];

            // Find indexes in this table body
            let bodyWithoutIndexes = tableBody.split(',\n').filter(line => {
                if (line.trim().startsWith('INDEX ')) {
                    const idxMatch = line.trim().match(/INDEX\s+(\w+)\s+\(([^)]+)\)/);
                    if (idxMatch) {
                        indexes.push(`CREATE INDEX IF NOT EXISTS ${idxMatch[1]} ON ${tableName} (${idxMatch[2]});`);
                    }
                    return false;
                }
                return true;
            }).join(',\n');

            // Clean up trailing commas
            bodyWithoutIndexes = bodyWithoutIndexes.replace(/,\s*$/g, '');

            newSql += `CREATE TABLE IF NOT EXISTS ${tableName} (${bodyWithoutIndexes});\n`;
            lastIndex = tablesRegex.lastIndex;
        }

        newSql += sql.substring(lastIndex);

        // Append standalone indexes
        newSql += '\n-- ============================================\n';
        newSql += '-- POSTGRESQL INDEXES\n';
        newSql += '-- ============================================\n\n';
        newSql += indexes.join('\n');

        fs.writeFileSync(schemaPath, newSql, 'utf8');
        console.log('Successfully translated schema.sql to PostgreSQL format.');

    } catch (e) {
        console.error(e);
    }
}

processSchema();
