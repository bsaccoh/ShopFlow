const authService = require('./service');
const { sendSuccess, sendError } = require('../../utils/response');
const { logAudit } = require('../../middleware/auditLogger');

const login = async (req, res) => {
    try {
        const { email, password, isSuperAdmin } = req.body;

        if (!email || !password) {
            return sendError(res, 'Email and password are required', null, 400);
        }

        const { user, token, refreshToken } = await authService.authenticateUser(email, password, isSuperAdmin);

        // Set HTTP-only cookie for refresh token
        res.cookie('jwt_refresh', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Log login event
        await logAudit({
            tenantId: user.tenantId || null,
            userId: user.id,
            module: 'Auth',
            action: isSuperAdmin ? 'SUPER_ADMIN_LOGIN' : 'USER_LOGIN',
            recordId: user.id,
            oldData: null,
            newData: { email: user.email, role: user.role, loginAt: new Date().toISOString() },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
        });

        return sendSuccess(res, 'Login successful', { user, token, refreshToken });
    } catch (error) {
        // Log failed login attempt
        await logAudit({
            tenantId: null,
            userId: null,
            module: 'Auth',
            action: 'LOGIN_FAILED',
            recordId: null,
            oldData: null,
            newData: { email: req.body.email, reason: error.message },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
        });

        if (error.message === 'Invalid credentials' || error.message === 'Account inactive') {
            return sendError(res, error.message, null, 401);
        }
        return sendError(res, 'Internal server error during login: ' + error.message, error.stack, 500);
    }
};

const registerTenant = async (req, res) => {
    try {
        const { tenantName, email, password, firstName, lastName, phone } = req.body;

        if (!tenantName || !email || !password || !firstName || !lastName) {
            return sendError(res, 'All required fields must be provided', null, 400);
        }

        const result = await authService.createNewTenant({
            tenantName, email, password, firstName, lastName, phone
        });

        // Log tenant registration
        await logAudit({
            tenantId: result.tenantId || null,
            userId: result.userId || null,
            module: 'Auth',
            action: 'TENANT_REGISTERED',
            recordId: result.tenantId,
            oldData: null,
            newData: { tenantName, email, firstName, lastName },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
        });

        return sendSuccess(res, 'Tenant registered successfully', result, 201);
    } catch (error) {
        if (error.message.includes('already exists')) {
            return sendError(res, error.message, null, 409);
        }
        return sendError(res, 'Registration failed', error.message, 500);
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.jwt_refresh || req.body.refreshToken;

        if (!token) {
            return sendError(res, 'Refresh token required', null, 401);
        }

        const { newAccessToken, newRefreshToken, user } = await authService.renewTokens(token);

        res.cookie('jwt_refresh', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return sendSuccess(res, 'Token refreshed successfully', { user, token: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        return sendError(res, 'Invalid refresh token', error.message, 403);
    }
};

const logout = async (req, res) => {
    try {
        // Log logout event
        await logAudit({
            tenantId: req.tenantId || null,
            userId: req.user?.id || null,
            module: 'Auth',
            action: 'USER_LOGOUT',
            recordId: req.user?.id || null,
            oldData: null,
            newData: { email: req.user?.email, logoutAt: new Date().toISOString() },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
        });

        res.clearCookie('jwt_refresh');
        return sendSuccess(res, 'Logged out successfully');
    } catch (error) {
        return sendError(res, 'Logout failed', error.message, 500);
    }
};

const getProfile = async (req, res) => {
    try {
        let user = req.user;
        if (!user.isSuperAdmin && user.tenantId) {
            const latestFeatures = await authService.getLatestTenantFeatures(user.tenantId);
            user = { ...user, enabled_features: latestFeatures };
        }
        return sendSuccess(res, 'Profile retrieved', { user, tenant: req.tenant });
    } catch (error) {
        return sendError(res, 'Failed to get profile', error.message, 500);
    }
};

module.exports = {
    login,
    registerTenant,
    refreshToken,
    logout,
    getProfile
};
