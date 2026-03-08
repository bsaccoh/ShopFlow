const express = require('express');
const router = express.Router();
const productController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Barcode Lookup (Must be fast, for POS scanner)
router.get('/barcode/:barcode', productController.getProductByBarcode);

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Only admins and managers can modify products
router.use(authorizeRole(['admin', 'manager']));

router.post('/', auditMiddleware('Products'), productController.createProduct);
router.put('/:id', auditMiddleware('Products'), productController.updateProduct);
router.delete('/:id', auditMiddleware('Products'), productController.deleteProduct);

module.exports = router;
