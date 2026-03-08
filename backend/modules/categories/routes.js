const express = require('express');
const router = express.Router();
const categoryController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// All users can view categories implicitly, or we restrict it
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Only admins and managers can modify categories
router.use(authorizeRole(['admin', 'manager']));

router.post('/', auditMiddleware('Categories'), categoryController.createCategory);
router.put('/:id', auditMiddleware('Categories'), categoryController.updateCategory);
router.delete('/:id', auditMiddleware('Categories'), categoryController.deleteCategory);

module.exports = router;
