const categoryService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAll(req.tenantId);
        return sendSuccess(res, 'Categories retrieved', categories);
    } catch (error) {
        return sendError(res, 'Failed to fetch categories', error.message, 500);
    }
};

const getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getById(req.tenantId, req.params.id);
        if (!category) return sendError(res, 'Category not found', null, 404);
        return sendSuccess(res, 'Category retrieved', category);
    } catch (error) {
        return sendError(res, 'Failed to fetch category', error.message, 500);
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description, parentId } = req.body;
        if (!name) return sendError(res, 'Category name is required', null, 400);

        const category = await categoryService.create(req.tenantId, { name, description, parentId });

        if (req.audit) await req.audit('CREATE', category.id, null, category);

        return sendSuccess(res, 'Category created', category, 201);
    } catch (error) {
        if (error.message.includes('slug')) {
            return sendError(res, 'Category name already exists', null, 409);
        }
        return sendError(res, 'Failed to create category', error.message, 500);
    }
};

const updateCategory = async (req, res) => {
    try {
        const oldCategory = await categoryService.getById(req.tenantId, req.params.id);
        if (!oldCategory) return sendError(res, 'Category not found', null, 404);

        const updatedCategory = await categoryService.update(req.tenantId, req.params.id, req.body);

        if (req.audit) await req.audit('UPDATE', updatedCategory.id, oldCategory, updatedCategory);

        return sendSuccess(res, 'Category updated', updatedCategory);
    } catch (error) {
        return sendError(res, 'Failed to update category', error.message, 500);
    }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await categoryService.getById(req.tenantId, req.params.id);
        if (!category) return sendError(res, 'Category not found', null, 404);

        const success = await categoryService.remove(req.tenantId, req.params.id);
        if (!success) return sendError(res, 'Failed to delete or category is in use', null, 400);

        if (req.audit) await req.audit('DELETE', req.params.id, category, null);

        return sendSuccess(res, 'Category deleted successfully');
    } catch (error) {
        return sendError(res, 'Failed to delete category', error.message, 500);
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
