const { pool, withTransaction } = require('./database/connection');

async function test() {
    try {
        const res = await withTransaction(async (conn) => {
            const dbRes = await conn.query("INSERT INTO tenants (name, slug, email, settings) VALUES ('Test 2', 'test-123-2', 'test2@test.com', '{}')");
            console.log('Array destructure?:', dbRes);

            const [result] = dbRes;
            console.log('Result:', result);
            console.log('Insert ID:', result.insertId);
            return result;
        });
        console.log('Transaction success');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}
test();
