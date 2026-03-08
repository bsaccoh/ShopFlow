const { query } = require('../../database/connection');

const getAll = async (tenantId) => {
    const [categories] = await query('SELECT * FROM categories WHERE (tenant_id = ? OR tenant_id IS NULL) AND is_active = 1 ORDER BY name ASC', [tenantId]);
    return categories;
};

const getById = async (tenantId, id) => {
    const [rows] = await query('SELECT * FROM categories WHERE (tenant_id = ? OR tenant_id IS NULL) AND id = ?', [tenantId, id]);
    return rows[0] || null;
};

const create = async (tenantId, { name, description, parentId }) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const [result] = await query(
        'INSERT INTO categories (tenant_id, name, slug, description, parent_id) VALUES (?, ?, ?, ?, ?)',
        [tenantId, name, slug, description || null, parentId || null]
    );

    return await getById(tenantId, result.insertId);
};

const update = async (tenantId, id, updateData) => {
    const allowed = ['name', 'description', 'parent_id', 'is_active'];
    const updates = [];
    const values = [];

    allowed.forEach(field => {
        if (updateData[field] !== undefined) {
            if (field === 'name') {
                const slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                updates.push('name = ?', 'slug = ?');
                values.push(updateData.name, slug);
            } else {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }
    });

    if (updates.length > 0) {
        values.push(tenantId, id);
        await query(`UPDATE categories SET ${updates.join(', ')} WHERE (tenant_id = ? OR tenant_id IS NULL) AND id = ?`, values);
    }

    return await getById(tenantId, id);
};

const remove = async (tenantId, id) => {
    // Soft delete or real delete. Prefer soft delete to maintain referential integrity in products
    const [result] = await query('UPDATE categories SET is_active = 0 WHERE (tenant_id = ? OR tenant_id IS NULL) AND id = ?', [tenantId, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
