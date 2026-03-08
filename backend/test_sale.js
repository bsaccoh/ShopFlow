const salesService = require('./modules/sales/service');
const { pool } = require('./database/connection');

async function testSale() {
    try {
        const tenantId = 4;
        const userId = 7;
        const saleData = {
            items: [
                {
                    product_id: 11,
                    quantity: 1,
                    discount_type: 'NONE',
                    discount_value: 0
                }
            ],
            customer_id: null,
            payment_methods: [
                { method: 'CASH', amount: 17800 }
            ],
            status: 'COMPLETED'
            // no branch_id to simulate the missing field
        };

        console.log('--- Calling processSale ---');
        const result = await salesService.processSale(tenantId, userId, saleData);
        console.log('SUCCESS:', result);
    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        pool.end();
    }
}

testSale();
