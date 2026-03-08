const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getSuppliers = async (req, res) => {
    try {
        const search = req.query.search || '';
        const [suppliers] = await query(`
            SELECT * FROM suppliers WHERE tenant_id = ? AND name LIKE ? ORDER BY name
        `, [req.tenantId, `%${search}%`]);
        const formatted = suppliers.map(s => ({
            ...s,
            is_active: Buffer.isBuffer(s.is_active) ? s.is_active[0] === 1 : (s.is_active == 1)
        }));
        return sendSuccess(res, 'Suppliers retrieved', formatted);
    } catch (error) {
        return sendError(res, 'Failed to fetch suppliers', error.message, 500);
    }
};

const createSupplier = async (req, res) => {
    try {
        const { name, contact_person, email, phone, address, notes } = req.body;
        if (!name) return sendError(res, 'Supplier name is required', null, 400);

        const [result] = await query(`
            INSERT INTO suppliers (tenant_id, name, contact_person, email, phone, address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, name, contact_person || null, email || null, phone || null, address || null, notes || null]);

        if (req.audit) await req.audit('SUPPLIER_CREATE', result.insertId, null, { name, contact_person, email });

        return sendSuccess(res, 'Supplier created', { id: result.insertId, name, contact_person, email, phone, address, notes, is_active: 1 }, 201);
    } catch (error) {
        return sendError(res, 'Failed to create supplier', error.message, 500);
    }
};

const updateSupplier = async (req, res) => {
    try {
        const { name, contact_person, email, phone, address, notes } = req.body;
        const [existing] = await query('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Supplier not found', null, 404);

        await query(`
            UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=?, notes=? WHERE id=? AND tenant_id=?
        `, [name, contact_person, email, phone, address, notes, req.params.id, req.tenantId]);

        if (req.audit) await req.audit('SUPPLIER_UPDATE', req.params.id, existing[0], req.body);

        return sendSuccess(res, 'Supplier updated');
    } catch (error) {
        return sendError(res, 'Failed to update supplier', error.message, 500);
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const [existing] = await query('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (existing.length === 0) return sendError(res, 'Supplier not found', null, 404);

        await query('DELETE FROM suppliers WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (req.audit) await req.audit('SUPPLIER_DELETE', req.params.id, existing[0], null);

        return sendSuccess(res, 'Supplier deleted');
    } catch (error) {
        if (error.message.includes('foreign key')) return sendError(res, 'Cannot delete supplier with linked purchase orders', null, 400);
        return sendError(res, 'Failed to delete supplier', error.message, 500);
    }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };
