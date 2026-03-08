const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../../database/connection');

const generateTokens = (payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    return { token, refreshToken };
};

const authenticateUser = async (email, password, isSuperAdmin = false) => {
    let userRecord;
    let payload;

    const isSystemAdmin = isSuperAdmin || email === 'admin@babahpos.com';

    if (isSystemAdmin) {
        const [rows] = await query('SELECT * FROM super_admins WHERE email = ?', [email]);
        if (rows.length === 0) throw new Error('Invalid credentials');
        userRecord = rows[0];

        // MySQL BIT(1) could be Buffer or Number depending on cast options
        const isActive = Buffer.isBuffer(userRecord.is_active)
            ? userRecord.is_active[0] === 1
            : userRecord.is_active == 1; // Loose check handles true/1

        if (!isActive) throw new Error('Account inactive');

        const isValid = await bcrypt.compare(password, userRecord.password_hash);
        if (!isValid) throw new Error('Invalid credentials');

        payload = {
            id: userRecord.id,
            email: userRecord.email,
            isSuperAdmin: true,
            role: 'super_admin'
        };
    } else {
        // Regular tenant user
        const [rows] = await query(`
      SELECT u.*, r.slug as role_slug, t.name as tenant_name, t.settings as tenant_settings, b.name as branch_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.email = ?
    `, [email]);

        if (rows.length === 0) throw new Error('Invalid credentials');
        userRecord = rows[0];

        const isActive = Buffer.isBuffer(userRecord.is_active) ? userRecord.is_active[0] === 1 : userRecord.is_active === 1;
        if (!isActive) throw new Error('Account inactive');

        const isValid = await bcrypt.compare(password, userRecord.password_hash);
        if (!isValid) throw new Error('Invalid credentials');

        payload = {
            id: userRecord.id,
            tenantId: userRecord.tenant_id,
            tenant_name: userRecord.tenant_name,
            email: userRecord.email,
            role: userRecord.role_slug || 'user',
            branchId: userRecord.branch_id,
            branchName: userRecord.branch_name,
            enabled_features: (typeof userRecord.tenant_settings === 'string'
                ? JSON.parse(userRecord.tenant_settings)
                : userRecord.tenant_settings)?.enabled_features || []
        };
    }

    // Update last login (fire and forget)
    const table = isSuperAdmin ? 'super_admins' : 'users';
    query(`UPDATE ${table} SET last_login = NOW() WHERE id = ?`, [userRecord.id]).catch(console.error);

    const tokens = generateTokens(payload);

    // Clean up user record to return securely
    delete userRecord.password_hash;
    delete userRecord.refresh_token;

    return { user: userRecord, ...tokens };
};

const createNewTenant = async (tenantData) => {
    return await withTransaction(async (connection) => {
        // 1. Check if email already exists
        const existingUsers = await connection.query('SELECT id FROM users WHERE email = ?', [tenantData.email]);
        if (existingUsers[0].length > 0) throw new Error('Email already exists');

        // 2. Generate unique slug for tenant
        const slug = tenantData.tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

        // 3. Create Tenant
        const settings = JSON.stringify({
            enabled_features: tenantData.enabledFeatures || []
        });

        const [tenantResult] = await connection.query(
            'INSERT INTO tenants (name, slug, email, phone, settings) VALUES (?, ?, ?, ?, ?)',
            [tenantData.tenantName, slug, tenantData.email, tenantData.phone || null, settings]
        );
        const tenantId = tenantResult.insertId;

        // 4. Create default roles for the tenant
        const [roleResult] = await connection.query(
            'INSERT INTO roles (tenant_id, name, slug, description, is_system) VALUES (?, ?, ?, ?, ?)',
            [tenantId, 'Administrator', 'admin', 'Full access', 1]
        );
        const adminRoleId = roleResult.insertId;

        await connection.query(
            'INSERT INTO roles (tenant_id, name, slug, description, is_system) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
            [
                tenantId, 'Manager', 'manager', 'Store Manager', 1,
                tenantId, 'Cashier', 'cashier', 'POS operator', 1,
                tenantId, 'Inventory Manager', 'inventory_manager', 'Products, inventory & purchasing', 1
            ]
        );

        // 5. Create default "Main" branch
        const [branchResult] = await connection.query(
            'INSERT INTO branches (tenant_id, name, is_main, is_active) VALUES (?, ?, 1, 1)',
            [tenantId, 'Main Store']
        );
        const mainBranchId = branchResult.insertId;

        // 6. Create the tenant admin user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tenantData.password, salt);

        const [userResult] = await connection.query(
            'INSERT INTO users (tenant_id, role_id, branch_id, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tenantId, adminRoleId, mainBranchId, tenantData.email, passwordHash, tenantData.firstName, tenantData.lastName]
        );

        // 6. Assign subscription plan (use provided planId or default to plan 2)
        const selectedPlanId = tenantData.planId || 2;
        const subscriptionStatus = tenantData.planId ? 'ACTIVE' : 'TRIAL';

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + (subscriptionStatus === 'TRIAL' ? 14 : 30));

        await connection.query(
            'INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at) VALUES (?, ?, ?, ?, NOW(), ?, ?)',
            [tenantId, selectedPlanId, subscriptionStatus, tenantData.billingCycle || 'MONTHLY', periodEnd,
                subscriptionStatus === 'TRIAL' ? periodEnd : null]
        );

        // 7. Configure payment provider if specified
        if (tenantData.paymentProvider) {
            await connection.query(
                'INSERT INTO tenant_payment_configs (tenant_id, provider, is_active) VALUES (?, ?, 1)',
                [tenantId, tenantData.paymentProvider]
            );
        }

        // Return partial details
        return {
            tenantId,
            slug,
            adminUserId: userResult.insertId,
            email: tenantData.email
        };
    });
};

const renewTokens = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const payload = { ...decoded };

        // Remove iat, exp to allow signing new fresh tokens
        delete payload.iat;
        delete payload.exp;
        delete payload.nbf;
        delete payload.jti;

        const tokens = generateTokens(payload);
        return {
            newAccessToken: tokens.token,
            newRefreshToken: tokens.refreshToken,
            user: payload
        };
    } catch (error) {
        throw new Error('Token verification failed');
    }
};

const getLatestTenantFeatures = async (tenantId) => {
    const [rows] = await query('SELECT settings FROM tenants WHERE id = ?', [tenantId]);
    if (rows.length > 0 && rows[0].settings) {
        const settings = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
        return settings.enabled_features || [];
    }
    return [];
};

module.exports = {
    authenticateUser,
    createNewTenant,
    renewTokens,
    getLatestTenantFeatures
};
