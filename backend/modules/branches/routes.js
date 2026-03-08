const express = require('express');
const router = express.Router();
const branchController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const authorizeRole = require('../../middleware/rbac');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');

router.use(authenticate);
router.use(tenantResolver);
router.use(tenantGuard);

// Basic CRUD for branches (Admins and Managers)
router.use(authorizeRole(['admin', 'manager']));

router.get('/', branchController.getBranches);
router.post('/', branchController.createBranch);
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

// Inter-branch transfers
router.get('/transfers', branchController.getTransfers);
router.post('/transfers', branchController.createTransfer);
router.put('/transfers/:id/status', branchController.updateTransferStatus);

module.exports = router;
