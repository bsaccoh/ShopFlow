const express = require('express');
const router = express.Router();
const inventoryController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const { auditMiddleware } = require('../../middleware/auditLogger');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// All roles can view inventory levels and movements
router.get('/levels', inventoryController.getInventoryLevels);
router.get('/movements', inventoryController.getInventoryMovements);

// Only admins and managers can adjust stock manually
router.use(authorizeRole(['admin', 'manager']));

router.post('/adjust', auditMiddleware('Inventory'), inventoryController.adjustStock);

module.exports = router;
