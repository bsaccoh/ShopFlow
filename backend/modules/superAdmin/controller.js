const { query } = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../utils/response');

const getDashboardStats = async (req, res) => {
    try {
        const [[{ count: tenantCount }]] = await query('SELECT COUNT(*) as count FROM tenants');
        const [[{ count: activeTenants }]] = await query('SELECT COUNT(*) as count FROM tenants WHERE is_active = 1');
        const [[{ revenue: totalRevenue }]] = await query(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM subscriptions
            WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        `);
        const [[{ count: userCount }]] = await query('SELECT COUNT(*) as count FROM users');
        const [[{ count: usersThisWeek }]] = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE DATE(created_at) BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
        `);

        const [[currentMonthTenants]] = await query(`
            SELECT COUNT(*) as value
            FROM tenants
            WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        const [[previousMonthTenants]] = await query(`
            SELECT COUNT(*) as value
            FROM tenants
            WHERE TO_CHAR(created_at, 'YYYY-MM') = DATE_FORMAT(CURRENT_DATE - INTERVAL '1 months', '%Y-%m')
        `);

        const [[currentMonthRevenue]] = await query(`
            SELECT COALESCE(SUM(amount), 0) as value
            FROM subscriptions
            WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
              AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        const [[previousMonthRevenue]] = await query(`
            SELECT COALESCE(SUM(amount), 0) as value
            FROM subscriptions
            WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
              AND TO_CHAR(created_at, 'YYYY-MM') = DATE_FORMAT(CURRENT_DATE - INTERVAL '1 months', '%Y-%m')
        `);

        const [monthlyGrowthRows] = await query(`
            SELECT month_key,
                   COALESCE(SUM(tenants_added), 0) as tenants,
                   COALESCE(SUM(revenue_added), 0) as revenue
            FROM (
                SELECT TO_CHAR(created_at, 'YYYY-MM') as month_key,
                       COUNT(*) as tenants_added,
                       0 as revenue_added
                FROM tenants
                WHERE created_at >= DATE_SUB(TO_CHAR(CURRENT_DATE, 'YYYY-MM-01'), INTERVAL 6 MONTH)
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')

                UNION ALL

                SELECT TO_CHAR(created_at, 'YYYY-MM') as month_key,
                       0 as tenants_added,
                       COALESCE(SUM(amount), 0) as revenue_added
                FROM subscriptions
                WHERE created_at >= DATE_SUB(TO_CHAR(CURRENT_DATE, 'YYYY-MM-01'), INTERVAL 6 MONTH)
                  AND status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ) merged
            GROUP BY month_key
            ORDER BY month_key ASC
        `);

        const monthlyGrowthMap = new Map(
            monthlyGrowthRows.map((row) => [row.month_key, row])
        );
        const monthlyGrowth = Array.from({ length: 7 }).map((_, idx) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (6 - idx));
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const row = monthlyGrowthMap.get(monthKey);
            return {
                month: date.toLocaleDateString('en-US', { month: 'short' }),
                tenants: Number(row?.tenants || 0),
                revenue: Number(row?.revenue || 0)
            };
        });

        const [planDistribution] = await query(`
            SELECT COALESCE(p.name, 'Unassigned') as name, COUNT(*) as value
            FROM subscriptions s
            LEFT JOIN subscription_plans p ON s.plan_id = p.id
            WHERE s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED')
            GROUP BY p.name
            ORDER BY value DESC
        `);

        const [weeklySignupsRows] = await query(`
            SELECT DATE(created_at) as day, COUNT(*) as signups
            FROM tenants
            WHERE DATE(created_at) BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        `);

        const weeklySignupsMap = new Map(
            weeklySignupsRows.map((row) => {
                const dayKey = new Date(row.day).toISOString().split('T')[0];
                return [dayKey, Number(row.signups || 0)];
            })
        );
        const weeklySignups = Array.from({ length: 7 }).map((_, idx) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - idx));
            const dayKey = date.toISOString().split('T')[0];
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                signups: weeklySignupsMap.get(dayKey) || 0
            };
        });
        const activeTenantRate = tenantCount > 0 ? ((activeTenants / tenantCount) * 100) : 0;
        const tenantGrowthPct = Number(previousMonthTenants.value || 0) > 0
            ? (((Number(currentMonthTenants.value || 0) - Number(previousMonthTenants.value || 0)) / Number(previousMonthTenants.value || 0)) * 100)
            : (Number(currentMonthTenants.value || 0) > 0 ? 100 : 0);
        const revenueGrowthPct = Number(previousMonthRevenue.value || 0) > 0
            ? (((Number(currentMonthRevenue.value || 0) - Number(previousMonthRevenue.value || 0)) / Number(previousMonthRevenue.value || 0)) * 100)
            : (Number(currentMonthRevenue.value || 0) > 0 ? 100 : 0);

        const [recentTenantsRaw] = await query(`
            SELECT t.*, s.status as subscription_status, p.name as plan_name
            FROM tenants t
            LEFT JOIN subscriptions s ON t.id = s.tenant_id
            LEFT JOIN subscription_plans p ON s.plan_id = p.id
            ORDER BY t.created_at DESC
            LIMIT 5
        `);

        const recentTenants = recentTenantsRaw.map(t => ({
            ...t,
            settings: typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings
        }));

        return sendSuccess(res, 'Super admin stats retrieved', {
            stats: {
                totalTenants: tenantCount,
                activeTenants: activeTenants,
                totalRevenue: totalRevenue || 0,
                totalUsers: userCount,
                usersThisWeek: usersThisWeek || 0,
                activeTenantRate: Number(activeTenantRate.toFixed(1)),
                tenantGrowthPct: Number(tenantGrowthPct.toFixed(1)),
                revenueGrowthPct: Number(revenueGrowthPct.toFixed(1))
            },
            monthlyGrowth,
            planDistribution,
            weeklySignups,
            recentTenants
        });
    } catch (error) {
        return sendError(res, 'Failed to retrieve platform stats', error.message, 500);
    }
};

const getTenants = async (req, res) => {
    try {
        const [tenantsRaw] = await query(`
            SELECT t.*, s.status as subscription_status, p.name as plan_name
            FROM tenants t
            LEFT JOIN subscriptions s ON t.id = s.tenant_id
            LEFT JOIN subscription_plans p ON s.plan_id = p.id
            ORDER BY t.created_at DESC
        `);
        const tenants = tenantsRaw.map(t => ({
            ...t,
            settings: typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings
        }));
        return sendSuccess(res, 'Tenants retrieved', tenants);
    } catch (error) {
        return sendError(res, 'Failed to fetch tenants', error.message, 500);
    }
};

const getTenantById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await query(`
            SELECT t.*, s.status as subscription_status, s.billing_cycle, s.current_period_start, s.current_period_end, s.trial_ends_at, s.plan_id,
                   p.name as plan_name, p.price_monthly, p.max_users, p.max_products
            FROM tenants t
            LEFT JOIN subscriptions s ON t.id = s.tenant_id
            LEFT JOIN subscription_plans p ON s.plan_id = p.id
            WHERE t.id = ?
        `, [id]);

        if (rows.length === 0) return sendError(res, 'Tenant not found', null, 404);
        const tenant = rows[0];
        tenant.settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        return sendSuccess(res, 'Tenant details retrieved', tenant);
    } catch (error) {
        return sendError(res, 'Failed to fetch tenant', error.message, 500);
    }
};

const updateTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, city, country, settings } = req.body;

        const sets = [];
        const vals = [];
        if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
        if (email !== undefined) { sets.push('email = ?'); vals.push(email); }
        if (phone !== undefined) { sets.push('phone = ?'); vals.push(phone); }
        if (address !== undefined) { sets.push('address = ?'); vals.push(address); }
        if (city !== undefined) { sets.push('city = ?'); vals.push(city); }
        if (country !== undefined) { sets.push('country = ?'); vals.push(country); }
        if (settings !== undefined) {
            sets.push('settings = ?');
            vals.push(typeof settings === 'object' ? JSON.stringify(settings) : settings);
        }

        if (sets.length === 0) return sendError(res, 'No fields to update', null, 400);

        vals.push(id);
        await query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`, vals);

        return sendSuccess(res, 'Tenant updated successfully');
    } catch (error) {
        return sendError(res, 'Failed to update tenant', error.message, 500);
    }
};

const updateTenantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await query('UPDATE tenants SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
        return sendSuccess(res, `Tenant ${is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
        return sendError(res, 'Failed to update tenant status', error.message, 500);
    }
};

const getSubscriptions = async (req, res) => {
    try {
        const [subscriptions] = await query(`
            SELECT s.*, t.name as tenant_name, t.email as tenant_email, p.name as plan_name, p.price_monthly 
            FROM subscriptions s
            JOIN tenants t ON s.tenant_id = t.id
            JOIN subscription_plans p ON s.plan_id = p.id
            ORDER BY s.created_at DESC
        `);
        return sendSuccess(res, 'All platform subscriptions retrieved', subscriptions);
    } catch (error) {
        return sendError(res, 'Failed to fetch platform subscriptions', error.message, 500);
    }
};

// ── Subscription Plans CRUD ─────────────────────────────────
const getPlans = async (req, res) => {
    try {
        const [plans] = await query('SELECT * FROM subscription_plans ORDER BY sort_order ASC');
        return sendSuccess(res, 'Subscription plans retrieved', plans);
    } catch (error) {
        return sendError(res, 'Failed to fetch plans', error.message, 500);
    }
};

const createPlan = async (req, res) => {
    try {
        const { name, description, price_monthly, price_yearly, max_users, max_products, max_branches,
            has_api_access, has_advanced_reports, has_multi_warehouse, has_mobile_money, sort_order } = req.body;

        if (!name || price_monthly === undefined) {
            return sendError(res, 'Plan name and monthly price are required', null, 400);
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const [result] = await query(
            `INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_users, max_products, max_branches,
             has_api_access, has_advanced_reports, has_multi_warehouse, has_mobile_money, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, slug, description || null, price_monthly, price_yearly || 0, max_users || 5, max_products || 100, max_branches || 1,
                has_api_access ? 1 : 0, has_advanced_reports ? 1 : 0, has_multi_warehouse ? 1 : 0, has_mobile_money ? 1 : 0, sort_order || 0]
        );

        const [newPlan] = await query('SELECT * FROM subscription_plans WHERE id = ?', [result.insertId]);
        return sendSuccess(res, 'Subscription plan created', newPlan[0], 201);
    } catch (error) {
        return sendError(res, 'Failed to create plan', error.message, 500);
    }
};

const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = ['name', 'description', 'price_monthly', 'price_yearly', 'max_users', 'max_products',
            'max_branches', 'has_api_access', 'has_advanced_reports', 'has_multi_warehouse', 'has_mobile_money', 'is_active', 'sort_order'];
        const sets = [];
        const vals = [];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                sets.push(`${field} = ?`);
                vals.push(req.body[field]);
            }
        });

        if (sets.length === 0) return sendError(res, 'No fields to update', null, 400);

        vals.push(id);
        await query(`UPDATE subscription_plans SET ${sets.join(', ')} WHERE id = ?`, vals);

        const [updated] = await query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
        return sendSuccess(res, 'Plan updated', updated[0]);
    } catch (error) {
        return sendError(res, 'Failed to update plan', error.message, 500);
    }
};

const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft-delete by deactivating
        await query('UPDATE subscription_plans SET is_active = 0 WHERE id = ?', [id]);
        return sendSuccess(res, 'Plan deactivated successfully');
    } catch (error) {
        return sendError(res, 'Failed to delete plan', error.message, 500);
    }
};

// ── Super Admin Users Management ─────────────────────────────
const getAdminUsers = async (req, res) => {
    try {
        const [admins] = await query('SELECT id, email, first_name, last_name, is_active, last_login, created_at FROM super_admins ORDER BY created_at DESC');
        const formatted = admins.map(a => ({
            ...a,
            is_active: Buffer.isBuffer(a.is_active) ? a.is_active[0] === 1 : a.is_active === 1
        }));
        return sendSuccess(res, 'Admin users retrieved', formatted);
    } catch (error) {
        return sendError(res, 'Failed to fetch admin users', error.message, 500);
    }
};

const createAdminUser = async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;
        if (!email || !password || !first_name || !last_name) {
            return sendError(res, 'Email, password, first name, and last name are required', null, 400);
        }

        const [existing] = await query('SELECT id FROM super_admins WHERE email = ?', [email]);
        if (existing.length > 0) {
            return sendError(res, 'A super admin with this email already exists', null, 409);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await query(
            'INSERT INTO super_admins (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, first_name, last_name]
        );

        return sendSuccess(res, 'Super admin created successfully', {
            id: result.insertId, email, first_name, last_name, is_active: true
        }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create admin user', error.message, 500);
    }
};

const updateAdminStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await query('UPDATE super_admins SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
        return sendSuccess(res, `Admin user ${is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
        return sendError(res, 'Failed to update admin status', error.message, 500);
    }
};

// ── Activity Logs ────────────────────────────────────────────
const getActivityLogs = async (req, res) => {
    try {
        const { tenant_id, module, action, limit = 100, offset = 0 } = req.query;
        let sql = `
            SELECT al.*, t.name as tenant_name, u.first_name, u.last_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN tenants t ON al.tenant_id = t.id
            LEFT JOIN users u ON al.user_id = u.id
        `;
        const conditions = [];
        const params = [];

        if (tenant_id) { conditions.push('al.tenant_id = ?'); params.push(tenant_id); }
        if (module) { conditions.push('al.module = ?'); params.push(module); }
        if (action) { conditions.push('al.action = ?'); params.push(action); }

        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await query(sql, params);
        return sendSuccess(res, 'Activity logs retrieved', logs);
    } catch (error) {
        return sendError(res, 'Failed to fetch activity logs', error.message, 500);
    }
};

module.exports = {
    getDashboardStats,
    getTenants,
    getTenantById,
    updateTenant,
    updateTenantStatus,
    getSubscriptions,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getAdminUsers,
    createAdminUser,
    updateAdminStatus,
    getActivityLogs
};
