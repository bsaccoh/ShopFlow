const branchService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const getBranches = async (req, res) => {
    try {
        const branches = await branchService.getAll(req.tenantId);
        return sendSuccess(res, 'Branches retrieved', branches);
    } catch (error) {
        return sendError(res, 'Failed to fetch branches', error.message, 500);
    }
};

const createBranch = async (req, res) => {
    try {
        // Multi-warehouse feature check
        if (!req.subscriptionFeatures?.multiWarehouse) {
            return sendError(res, 'Multi-branch feature requires a plan upgrade', null, 403);
        }

        const currentBranches = await branchService.getAll(req.tenantId);
        if (currentBranches.length >= (req.subscriptionFeatures?.maxBranches || 1)) {
            return sendError(res, `Branch limit reached (${req.subscriptionFeatures?.maxBranches || 1}). Please upgrade your plan.`, null, 403);
        }

        const data = { ...req.body, tenantId: req.tenantId };
        const newBranch = await branchService.create(data);

        if (req.audit) await req.audit('CREATE_BRANCH', newBranch.id, null, newBranch);

        return sendSuccess(res, 'Branch created', newBranch, 201);
    } catch (error) {
        return sendError(res, 'Failed to create branch', error.message, 500);
    }
};

const updateBranch = async (req, res) => {
    try {
        const branchId = req.params.id;
        const data = { ...req.body, tenantId: req.tenantId };

        const updatedBranch = await branchService.update(branchId, data);
        if (!updatedBranch) return sendError(res, 'Branch not found', null, 404);

        if (req.audit) await req.audit('UPDATE_BRANCH', branchId, null, updatedBranch);

        return sendSuccess(res, 'Branch updated', updatedBranch);
    } catch (error) {
        return sendError(res, 'Failed to update branch', error.message, 500);
    }
};

const deleteBranch = async (req, res) => {
    try {
        const branchId = req.params.id;
        // Basic check if transfers exist could happen here or in service.
        await branchService.remove(req.tenantId, branchId);

        if (req.audit) await req.audit('DELETE_BRANCH', branchId, { deleted: true }, null);

        return sendSuccess(res, 'Branch deleted');
    } catch (error) {
        return sendError(res, 'Failed to delete branch', error.message, 500);
    }
};

// --- Transfers ---

const getTransfers = async (req, res) => {
    try {
        const transfers = await branchService.getTransfers(req.tenantId);
        return sendSuccess(res, 'Transfers retrieved', transfers);
    } catch (error) {
        return sendError(res, 'Failed to fetch transfers', error.message, 500);
    }
};

const createTransfer = async (req, res) => {
    try {
        const { from_branch, to_branch, items } = req.body;

        if (!from_branch || !to_branch || !items || !items.length) {
            return sendError(res, 'Source, destination, and items are required', null, 400);
        }

        if (from_branch === to_branch) {
            return sendError(res, 'Source and destination branches must be different', null, 400);
        }

        const transfer = await branchService.createTransfer(req.tenantId, req.user.id, {
            from_branch, to_branch, items
        });

        if (req.audit) await req.audit('CREATE_TRANSFER', transfer.transferId, null, { from: from_branch, to: to_branch, items });

        return sendSuccess(res, 'Transfer created', transfer, 201);
    } catch (error) {
        if (error.message.includes('Insufficient stock')) {
            return sendError(res, error.message, null, 400);
        }
        return sendError(res, 'Failed to create transfer', error.message, 500);
    }
};

const updateTransferStatus = async (req, res) => {
    try {
        const transferId = req.params.id;
        const { status } = req.body; // PENDING -> IN_TRANSIT -> RECEIVED or CANCELLED

        if (!status) return sendError(res, 'Status is required', null, 400);

        const result = await branchService.updateTransferStatus(req.tenantId, req.user.id, transferId, status);

        if (req.audit) await req.audit('UPDATE_TRANSFER_STATUS', transferId, null, { status });

        return sendSuccess(res, 'Transfer status updated', result);
    } catch (error) {
        return sendError(res, 'Failed to update transfer status', error.message, 400);
    }
};

module.exports = {
    getBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    getTransfers,
    createTransfer,
    updateTransferStatus
};
