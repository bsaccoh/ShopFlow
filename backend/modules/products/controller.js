const productService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const getAllProducts = async (req, res) => {
    try {
        const filters = {
            categoryId: req.query.category_id,
            search: req.query.search,
            stockLow: req.query.stock_low === 'true',
            warehouse: req.user.branchName || 'main'
        };

        const products = await productService.getAll(req.tenantId, filters);
        return sendSuccess(res, 'Products retrieved', products);
    } catch (error) {
        return sendError(res, 'Failed to fetch products', error.message, 500);
    }
};

const getProductById = async (req, res) => {
    try {
        const warehouse = req.user.branchName || 'main';
        const product = await productService.getById(req.tenantId, req.params.id, warehouse);
        if (!product) return sendError(res, 'Product not found', null, 404);

        return sendSuccess(res, 'Product retrieved', product);
    } catch (error) {
        return sendError(res, 'Failed to fetch product', error.message, 500);
    }
};

const getProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        if (!barcode) return sendError(res, 'Barcode is required', null, 400);

        const warehouse = req.user.branchName || 'main';
        const product = await productService.getByBarcode(req.tenantId, barcode, warehouse);
        if (!product) return sendError(res, 'Product not found', null, 404);

        return sendSuccess(res, 'Product located', product);
    } catch (error) {
        return sendError(res, 'Barcode lookup failed', error.message, 500);
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, cost_price, selling_price, barcode } = req.body;

        if (!name || cost_price === undefined || selling_price === undefined) {
            return sendError(res, 'Name, cost price, and selling price are required', null, 400);
        }

        const productData = {
            ...req.body,
            branch_id: req.user.branchId // Initialize stock in user's branch
        };

        const { product, inventory } = await productService.create(req.tenantId, productData);

        if (req.audit) await req.audit('CREATE', product.id, null, product);

        return sendSuccess(res, 'Product created', { product, inventory }, 201);
    } catch (error) {
        if (error.message.includes('barcode') || error.message.includes('sku')) {
            return sendError(res, 'Barcode or SKU already exists', null, 409);
        }
        return sendError(res, 'Failed to create product', error.message, 500);
    }
};

const updateProduct = async (req, res) => {
    try {
        const oldProduct = await productService.getById(req.tenantId, req.params.id);
        if (!oldProduct) return sendError(res, 'Product not found', null, 404);

        const updatedProduct = await productService.update(req.tenantId, req.params.id, req.body);

        if (req.audit) await req.audit('UPDATE', updatedProduct.id, oldProduct, updatedProduct);

        return sendSuccess(res, 'Product updated', updatedProduct);
    } catch (error) {
        return sendError(res, 'Failed to update product', error.message, 500);
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await productService.getById(req.tenantId, req.params.id);
        if (!product) return sendError(res, 'Product not found', null, 404);

        const success = await productService.remove(req.tenantId, req.params.id);
        if (!success) return sendError(res, 'Failed to delete product or it has sales history', null, 400);

        if (req.audit) await req.audit('DELETE', req.params.id, product, null);

        return sendSuccess(res, 'Product deleted successfully');
    } catch (error) {
        return sendError(res, 'Failed to delete product', error.message, 500);
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct
};
