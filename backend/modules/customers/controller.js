const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getCustomers = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const searchQuery = req.query.search || '';

        const [customers] = await query(`
            SELECT id, name, email, phone, address, loyalty_points, total_spent, is_active, created_at 
            FROM customers 
            WHERE tenant_id = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
            ORDER BY created_at DESC
        `, [tenantId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

        const formattedCustomers = customers.map(cust => ({
            ...cust,
            is_active: !!cust.is_active
        }));

        return sendSuccess(res, 'Customers retrieved', formattedCustomers);
    } catch (error) {
        return sendError(res, 'Failed to fetch customers', error.message, 500);
    }
};

const createCustomer = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { name, email, phone, address } = req.body;

        if (!name) {
            return sendError(res, 'Customer name is required', null, 400);
        }

        const [result] = await query(`
            INSERT INTO customers (tenant_id, name, email, phone, address, is_active)
            VALUES (?, ?, ?, ?, ?, true)
        `, [tenantId, name, email || null, phone || null, address || null]);

        const insertId = result.insertId;

        const newCustomer = {
            id: insertId,
            name, email, phone, address, loyalty_points: 0, total_spent: 0, is_active: true
        };

        if (req.audit) {
            await req.audit('CUSTOMER_CREATE', insertId, null, newCustomer);
        }

        return sendSuccess(res, 'Customer created successfully', newCustomer, 201);
    } catch (error) {
        return sendError(res, 'Failed to create customer', error.message, 500);
    }
};

const updateCustomer = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { name, email, phone, address } = req.body;

        if (!name) {
            return sendError(res, 'Customer name is required', null, 400);
        }

        // Verify customer belongs to this tenant
        const [existing] = await query(
            'SELECT id FROM customers WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        if (existing.length === 0) {
            return sendError(res, 'Customer not found', null, 404);
        }

        await query(
            'UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND tenant_id = ?',
            [name, email || null, phone || null, address || null, id, tenantId]
        );

        const updatedCustomer = { id: parseInt(id), name, email, phone, address };

        if (req.audit) {
            await req.audit('CUSTOMER_UPDATE', id, null, updatedCustomer);
        }

        return sendSuccess(res, 'Customer updated successfully', updatedCustomer);
    } catch (error) {
        return sendError(res, 'Failed to update customer', error.message, 500);
    }
};

module.exports = {
    getCustomers,
    createCustomer,
    updateCustomer
};
