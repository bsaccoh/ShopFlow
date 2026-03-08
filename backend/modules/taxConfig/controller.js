const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

// Helper: resolve tenant ID from req context or request body (for super admin)
const resolveTenantId = (req) => {
    return req.tenantId || req.body?.tenant_id || req.query?.tenant_id || null;
};

// Super admin: get all tenants with their tax configs
const getAllTenantTaxes = async (req, res) => {
    try {
        const [rows] = await query(`
            SELECT t.id as tenant_id, t.name as tenant_name, t.email as tenant_email,
                   tc.id as tax_id, tc.name as tax_name, tc.rate, tc.is_default, tc.is_active, tc.created_at
            FROM tenants t
            LEFT JOIN tax_config tc ON t.id = tc.tenant_id
            ORDER BY t.name, tc.name
        `);

        // Group by tenant
        const tenantsMap = {};
        rows.forEach(r => {
            if (!tenantsMap[r.tenant_id]) {
                tenantsMap[r.tenant_id] = {
                    tenant_id: r.tenant_id,
                    tenant_name: r.tenant_name,
                    tenant_email: r.tenant_email,
                    taxes: []
                };
            }
            if (r.tax_id) {
                tenantsMap[r.tenant_id].taxes.push({
                    id: r.tax_id,
                    name: r.tax_name,
                    rate: r.rate,
                    is_default: Buffer.isBuffer(r.is_default) ? r.is_default[0] === 1 : (r.is_default == 1),
                    is_active: Buffer.isBuffer(r.is_active) ? r.is_active[0] === 1 : (r.is_active == 1),
                    created_at: r.created_at
                });
            }
        });

        return sendSuccess(res, 'All tenant taxes', Object.values(tenantsMap));
    } catch (error) {
        return sendError(res, 'Failed to fetch tenant taxes', error.message, 500);
    }
};

const getTaxRates = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        if (!tenantId) return sendSuccess(res, 'No tenant selected', []);

        const [rates] = await query('SELECT * FROM tax_config WHERE tenant_id = ? ORDER BY name', [tenantId]);
        const formatted = rates.map(r => ({
            ...r,
            is_default: Buffer.isBuffer(r.is_default) ? r.is_default[0] === 1 : (r.is_default == 1),
            is_active: Buffer.isBuffer(r.is_active) ? r.is_active[0] === 1 : (r.is_active == 1),
        }));
        return sendSuccess(res, 'Tax rates retrieved', formatted);
    } catch (error) {
        return sendError(res, 'Failed to fetch tax rates', error.message, 500);
    }
};

const createTaxRate = async (req, res) => {
    try {
        const { name, rate, is_default } = req.body;
        const tenantId = resolveTenantId(req);
        if (!name || rate === undefined) return sendError(res, 'Name and rate are required', null, 400);
        if (!tenantId) return sendError(res, 'Tenant context required. Please select a tenant.', null, 400);

        // If setting as default, unset others
        if (is_default) {
            await query('UPDATE tax_config SET is_default = 0 WHERE tenant_id = ?', [tenantId]);
        }

        const [result] = await query(`
            INSERT INTO tax_config (tenant_id, name, rate, is_default) VALUES (?, ?, ?, ?)
        `, [tenantId, name, rate, is_default ? 1 : 0]);

        if (req.audit) await req.audit('TAX_CREATE', result.insertId, null, { name, rate });
        return sendSuccess(res, 'Tax rate created', { id: result.insertId }, 201);
    } catch (error) {
        console.error('Tax Create Error:', error);
        return sendError(res, 'Failed to create tax rate', error.message, 500);
    }
};

const updateTaxRate = async (req, res) => {
    try {
        const { name, rate, is_default, is_active } = req.body;
        const tenantId = resolveTenantId(req);
        if (!tenantId) return sendError(res, 'Tenant context required', null, 400);

        const [existing] = await query('SELECT * FROM tax_config WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
        if (existing.length === 0) return sendError(res, 'Tax rate not found', null, 404);

        if (is_default) {
            await query('UPDATE tax_config SET is_default = 0 WHERE tenant_id = ?', [tenantId]);
        }

        await query(`UPDATE tax_config SET name=?, rate=?, is_default=?, is_active=? WHERE id=? AND tenant_id=?`,
            [name, rate, is_default ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id, tenantId]);

        if (req.audit) await req.audit('TAX_UPDATE', req.params.id, existing[0], req.body);
        return sendSuccess(res, 'Tax rate updated');
    } catch (error) {
        return sendError(res, 'Failed to update tax rate', error.message, 500);
    }
};

const deleteTaxRate = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        if (!tenantId) return sendError(res, 'Tenant context required', null, 400);

        const [existing] = await query('SELECT * FROM tax_config WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
        if (existing.length === 0) return sendError(res, 'Tax rate not found', null, 404);
        await query('DELETE FROM tax_config WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
        if (req.audit) await req.audit('TAX_DELETE', req.params.id, existing[0], null);
        return sendSuccess(res, 'Tax rate deleted');
    } catch (error) {
        return sendError(res, 'Failed to delete tax rate', error.message, 500);
    }
};

module.exports = { getTaxRates, createTaxRate, updateTaxRate, deleteTaxRate, getAllTenantTaxes };
