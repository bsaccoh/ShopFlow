const tenantService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');

const getTenantProfile = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await tenantService.getTenantById(tenantId);

        if (!profile) {
            return sendError(res, 'Tenant not found', null, 404);
        }

        return sendSuccess(res, 'Tenant profile retrieved', profile);
    } catch (error) {
        return sendError(res, 'Failed to fetch tenant', error.message, 500);
    }
};

const updateTenantProfile = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const updateData = req.body;

        // Fetch old data for audit
        const oldProfile = await tenantService.getTenantById(tenantId);

        const updatedProfile = await tenantService.updateTenant(tenantId, updateData);

        // Trigger audit log manually using attached req.audit
        if (req.audit) {
            await req.audit('UPDATE_PROFILE', tenantId, oldProfile, updatedProfile);
        }

        return sendSuccess(res, 'Tenant profile updated successfully', updatedProfile);
    } catch (error) {
        return sendError(res, 'Failed to update tenant', error.message, 500);
    }
};

module.exports = {
    getTenantProfile,
    updateTenantProfile
};
