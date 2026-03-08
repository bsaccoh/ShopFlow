try {
    require('./server');
} catch (err) {
    require('fs').writeFileSync('err.log', err.toString() + '\\n' + err.stack, 'utf8');
}
