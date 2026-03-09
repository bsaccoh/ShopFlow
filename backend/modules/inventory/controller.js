const inventoryService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const getInventoryLevels = async (req, res) => {
    try {
        const defaultWarehouse = req.user.branchName || 'main';
        const filters = {
            warehouse: req.query.warehouse || defaultWarehouse,
            search: req.query.search
        };

        // Check if tenant has multi-warehouse feature
        const userBranch = req.user.branchName || 'main';
        if (filters.warehouse !== userBranch && !req.subscriptionFeatures?.multiWarehouse) {
            return sendError(res, 'Multi-warehouse feature is not available on your current plan', null, 403);
        }

        const levels = await inventoryService.getLevels(req.tenantId, filters);
        return sendSuccess(res, 'Inventory levels retrieved', levels);
    } catch (error) {
        return sendError(res, 'Failed to fetch inventory levels', error.message, 500);
    }
};

const getInventoryMovements = async (req, res) => {
    try {
        const filters = {
            productId: req.query.product_id,
            startDate: req.query.start_date,
            endDate: req.query.end_date,
            type: req.query.type,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const movements = await inventoryService.getMovements(req.tenantId, filters);
        return sendSuccess(res, 'Inventory movements retrieved', movements);
    } catch (error) {
        return sendError(res, 'Failed to fetch inventory movements', error.message, 500);
    }
};

const adjustStock = async (req, res) => {
    try {
        const defaultWarehouse = req.user.branchName || 'main';
        const { product_id, adjustment_type, quantity, reason, warehouse = defaultWarehouse } = req.body;

        if (!product_id || !adjustment_type || quantity === undefined) {
            return sendError(res, 'Product ID, adjustment type (ADD/REMOVE/SET), and quantity are required', null, 400);
        }

        if (warehouse !== defaultWarehouse && !req.subscriptionFeatures?.multiWarehouse) {
            return sendError(res, 'Multi-warehouse feature is not available on your current plan', null, 403);
        }

        const result = await inventoryService.adjust(req.tenantId, req.user.id, {
            product_id,
            adjustment_type,
            quantity: parseInt(quantity),
            reason,
            warehouse
        });

        if (req.audit) {
            await req.audit('ADJUST_STOCK', product_id, { previousStock: result.previousQuantity }, { newStock: result.newQuantity, reason });
        }

        return sendSuccess(res, 'Stock adjusted successfully', result);
    } catch (error) {
        if (error.message.includes('Insufficient stock')) {
            return sendError(res, error.message, null, 400);
        }
        return sendError(res, 'Failed to adjust stock', error.message, 500);
    }
};

module.exports = {
    getInventoryLevels,
    getInventoryMovements,
    adjustStock
};
