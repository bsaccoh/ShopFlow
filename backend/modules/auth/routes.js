const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticate } = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const tenantGuard = require('../../middleware/tenantGuard');
const bcrypt = require('bcryptjs');
const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');
const { logAudit } = require('../../middleware/auditLogger');

// Public routes
router.post('/login', authController.login);
router.post('/register-tenant', authController.registerTenant);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authenticate);
router.use(tenantResolver);

router.post('/logout', tenantGuard, authController.logout);
router.get('/me', tenantGuard, authController.getProfile);

// Change password
router.put('/change-password', tenantGuard, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return sendError(res, 'Current password and new password are required', null, 400);
        }
        if (newPassword.length < 6) {
            return sendError(res, 'New password must be at least 6 characters', null, 400);
        }

        // Determine table based on user type
        const table = req.user.isSuperAdmin ? 'super_admins' : 'users';
        const [rows] = await query(`SELECT password_hash FROM ${table} WHERE id = ?`, [req.user.id]);
        if (rows.length === 0) return sendError(res, 'User not found', null, 404);

        const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!valid) return sendError(res, 'Current password is incorrect', null, 401);

        const hash = await bcrypt.hash(newPassword, 12);
        await query(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [hash, req.user.id]);

        await logAudit({
            tenantId: req.tenantId || null,
            userId: req.user.id,
            module: 'Auth',
            action: 'PASSWORD_CHANGED',
            recordId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        return sendSuccess(res, 'Password changed successfully');
    } catch (error) {
        return sendError(res, 'Failed to change password', error.message, 500);
    }
});

module.exports = router;
