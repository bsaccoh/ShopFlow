const fs = require('fs');
const path = require('path');

const directoryToScan = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // We want to be careful not to replace 'Level', 'Learn', 'Let', etc.
    // So we replace "Le " and "LE " (with trailing space).
    // We also need to replace "Le {" and "LE {", often found in React e.g. "Le {stats.total}"
    // And finally `Le ${` and `LE ${` for template literals.

    const regexes = [
        { regex: /Le /g, replacement: 'SLE ' },
        { regex: /LE /g, replacement: 'SLE ' },
        { regex: /Le \{/g, replacement: 'SLE {' },
        { regex: /LE \{/g, replacement: 'SLE {' },
        { regex: /Le \$\{/g, replacement: 'SLE ${' },
        { regex: /LE \$\{/g, replacement: 'SLE ${' },
    ];

    for (const r of regexes) {
        if (r.regex.test(content)) {
            content = content.replace(r.regex, r.replacement);
            hasChanges = true;
        }
    }

    if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
            processFile(fullPath);
        }
    }
}

console.log('Starting currency symbol replacement...');
scanDir(directoryToScan);
console.log('Finished updating currency symbols.');
