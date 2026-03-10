const salesService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const createSale = async (req, res) => {
    try {
        const { items, customer_id, discount, payment_methods, notes, status } = req.body;

        // items: [{ product_id, quantity, unit_price, discount_type, discount_value }]
        // payment_methods: [{ method: 'CASH', amount: 100 }, ...]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return sendError(res, 'Sale must contain at least one item', null, 400);
        }

        const saleData = {
            ...req.body,
            branch_id: req.user.branchId // Use branch assigned to user
        };

        const saleResult = await salesService.processSale(req.tenantId, req.user.id, saleData);

        if (req.audit) {
            await req.audit('CREATE_SALE', saleResult.saleId, null, saleResult);
        }

        return sendSuccess(res, 'Sale processed successfully', saleResult, 201);
    } catch (error) {
        if (error.message.includes('Insufficient stock')) {
            return sendError(res, error.message, null, 400);
        }
        // E.g., validation errors
        if (error.message.includes('Payment amount')) {
            return sendError(res, error.message, null, 400);
        }
        return sendError(res, 'Failed to process sale', error.message, 500);
    }
};

const getSalesHistory = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.start_date,
            endDate: req.query.end_date,
            status: req.query.status,
            paymentStatus: req.query.payment_status,
            cashierId: req.user.role === 'admin' || req.user.role === 'manager'
                ? req.query.cashier_id // Admin can filter by cashier
                : req.user.id, // Cashier can only see their own sales
            customerId: req.query.customer_id,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const sales = await salesService.getHistory(req.tenantId, filters);
        return sendSuccess(res, 'Sales history retrieved', sales);
    } catch (error) {
        return sendError(res, 'Failed to fetch sales history', error.message, 500);
    }
};

const getSaleDetails = async (req, res) => {
    try {
        const saleId = req.params.id;
        const details = await salesService.getDetails(req.tenantId, saleId);

        if (!details) {
            return sendError(res, 'Sale not found', null, 404);
        }

        // Security check: If user is cashier, they can only view their own sales
        if (req.user.role === 'cashier' && details.sale.user_id !== req.user.id) {
            return sendError(res, 'Unauthorized to view this sale', null, 403);
        }

        return sendSuccess(res, 'Sale details retrieved', details);
    } catch (error) {
        return sendError(res, 'Failed to fetch sale details', error.message, 500);
    }
};

const voidSale = async (req, res) => {
    try {
        const saleId = req.params.id;
        const { reason } = req.body;

        const details = await salesService.getDetails(req.tenantId, saleId);
        if (!details) return sendError(res, 'Sale not found', null, 404);

        if (details.sale.status === 'VOIDED' || details.sale.status === 'REFUNDED') {
            return sendError(res, `Sale is already ${details.sale.status}`, null, 400);
        }

        const result = await salesService.voidTransaction(req.tenantId, saleId, req.user.id, reason);

        if (req.audit) {
            await req.audit('VOID_SALE', saleId, details, { reason, result });
        }

        return sendSuccess(res, 'Sale voided successfully', result);
    } catch (error) {
        return sendError(res, 'Failed to void sale', error.message, 500);
    }
};

module.exports = {
    createSale,
    getSalesHistory,
    getSaleDetails,
    voidSale
};
