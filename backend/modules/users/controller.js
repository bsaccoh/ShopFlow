const { query, pool } = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../utils/response');

const getStaff = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const searchQuery = req.query.search || '';

        const [users] = await query(`
            SELECT u.id, u.first_name, u.last_name, u.email, r.name as role, u.branch_id, b.name as branch_name, u.is_active, u.created_at 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.tenant_id = ? AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
            ORDER BY u.created_at DESC
        `, [tenantId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

        const formattedUsers = users.map(user => ({
            ...user,
            is_active: Buffer.isBuffer(user.is_active) ? user.is_active[0] === 1 : (user.is_active == 1)
        }));

        return sendSuccess(res, 'Staff members retrieved', formattedUsers);
    } catch (error) {
        return sendError(res, 'Failed to fetch staff', error.message, 500);
    }
};

const createStaff = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { first_name, last_name, email, password, role = 'cashier', branch_id } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return sendError(res, 'First name, last name, email, and password are required', null, 400);
        }

        // Check if email exists in this tenant
        const [existingRows] = await query('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
        if (existingRows.length > 0) {
            return sendError(res, 'Email already in use by another staff member', null, 409);
        }

        // Find the matching role (normalize to lowercase slug with underscores)
        const roleSlug = role.toLowerCase().replace(/\s+/g, '_');
        const [roleRows] = await query('SELECT id FROM roles WHERE tenant_id = ? AND slug = ? LIMIT 1', [tenantId, roleSlug]);
        let roleId = roleRows.length > 0 ? roleRows[0].id : null;

        if (!roleId) {
            // Fallback to cashier role
            const [defaultRows] = await query('SELECT id FROM roles WHERE tenant_id = ? AND slug = ? LIMIT 1', [tenantId, 'cashier']);
            roleId = defaultRows.length > 0 ? defaultRows[0].id : null;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await query(
            'INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role_id, branch_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [tenantId, first_name, last_name, email, hashedPassword, roleId, branch_id || null]
        );

        if (req.audit) {
            await req.audit('STAFF_CREATE', result.insertId, null, { first_name, last_name, email, role: roleSlug });
        }

        return sendSuccess(res, 'Staff member created successfully', {
            id: result.insertId, first_name, last_name, email, role: roleSlug, is_active: 1
        }, 201);
    } catch (error) {
        console.error('[createStaff Error]:', error.message);
        console.error('[createStaff SQL Code]:', error.code);
        console.error('[createStaff Full Error]:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 'A staff member with this email already exists', null, 409);
        }
        return sendError(res, 'Failed to create staff member: ' + error.message, null, 500);
    }
};

const updateStaff = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const staffId = req.params.id;
        const { first_name, last_name, role, branch_id, is_active } = req.body;

        if (!first_name || !last_name) {
            return sendError(res, 'First name and last name are required', null, 400);
        }

        // Verify the user exists and belongs to the tenant
        const [existing] = await query('SELECT id, email FROM users WHERE id = ? AND tenant_id = ?', [staffId, tenantId]);
        if (existing.length === 0) return sendError(res, 'Staff member not found', null, 404);

        // Cannot edit the main tenant admin role
        if (existing[0].email === req.tenant.email) {
            return sendError(res, 'Cannot modify the main tenant owner account from here', null, 403);
        }

        let roleId = null;
        if (role) {
            const roleSlug = role.toLowerCase();
            const [roleRows] = await query('SELECT id FROM roles WHERE tenant_id = ? AND slug = ? LIMIT 1', [tenantId, roleSlug]);
            if (roleRows.length > 0) roleId = roleRows[0].id;
        }

        let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?';
        let queryParams = [first_name, last_name];

        if (roleId) {
            updateQuery += ', role_id = ?';
            queryParams.push(roleId);
        }

        if (is_active !== undefined) {
            updateQuery += ', is_active = ?';
            queryParams.push(is_active ? 1 : 0);
        }

        if (branch_id !== undefined) {
            updateQuery += ', branch_id = ?';
            queryParams.push(branch_id || null);
        }

        updateQuery += ' WHERE id = ? AND tenant_id = ?';
        queryParams.push(staffId, tenantId);

        await query(updateQuery, queryParams);

        if (req.audit) {
            await req.audit('STAFF_UPDATE', staffId, null, { first_name, last_name, role });
        }

        return sendSuccess(res, 'Staff member updated successfully');
    } catch (error) {
        return sendError(res, 'Failed to update staff member', error.message, 500);
    }
};

module.exports = {
    getStaff,
    createStaff,
    updateStaff
};
