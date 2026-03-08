const { query } = require('../../database/connection');

const getTenantById = async (tenantId) => {
    const [rows] = await query(`
    SELECT id, name, slug, email, phone, address, city, country, currency, timezone, logo_url, settings
    FROM tenants 
    WHERE id = ?
  `, [tenantId]);

    return rows[0] || null;
};

const updateTenant = async (tenantId, updateData) => {
    const allowedFields = ['name', 'phone', 'address', 'city', 'country', 'currency', 'timezone', 'logo_url', 'settings'];

    const updates = [];
    const values = [];

    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
            updates.push(`${field} = ?`);
            // Convert settings JSON to string if present
            const val = field === 'settings' && typeof updateData[field] === 'object'
                ? JSON.stringify(updateData[field])
                : updateData[field];
            values.push(val);
        }
    });

    if (updates.length === 0) {
        return await getTenantById(tenantId);
    }

    values.push(tenantId);

    await query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values);

    return await getTenantById(tenantId);
};

module.exports = {
    getTenantById,
    updateTenant
};
