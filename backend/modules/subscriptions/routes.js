const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../../utils/response');
const { getTenantSubscription, getPlans } = require('./service');
const { authenticate } = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');

router.get('/plans', async (req, res) => {
    try {
        const plans = await getPlans();
        return sendSuccess(res, 'Available plans', plans);
    } catch (error) {
        return sendError(res, 'Failed to get plans', error.message, 500);
    }
});

router.use(authenticate);
router.use(tenantResolver);

router.get('/current', async (req, res) => {
    try {
        const sub = await getTenantSubscription(req.tenantId);
        if (!sub) return sendError(res, 'Subscription not found', null, 404);
        return sendSuccess(res, 'Current subscription', sub);
    } catch (error) {
        return sendError(res, 'Failed to get subscription', error.message, 500);
    }
});

module.exports = router;
