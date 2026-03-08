const { query, withTransaction } = require('../../database/connection');

const getAll = async (tenantId) => {
    const [branches] = await query(
        'SELECT * FROM branches WHERE tenant_id = ? ORDER BY is_main DESC, name ASC',
        [tenantId]
    );
    return branches;
};

const create = async (data) => {
    // If this is the first branch, make it main. If setting main, unset others.
    await withTransaction(async (conn) => {
        const [existing] = await conn.query('SELECT id FROM branches WHERE tenant_id = ? LIMIT 1', [data.tenantId]);
        const isMain = existing.length === 0 ? 1 : (data.is_main ? 1 : 0);

        if (isMain === 1 && existing.length > 0) {
            await conn.query('UPDATE branches SET is_main = 0 WHERE tenant_id = ?', [data.tenantId]);
        }

        await conn.query(
            'INSERT INTO branches (tenant_id, name, address, phone, is_main, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [data.tenantId, data.name, data.address || null, data.phone || null, isMain, data.is_active !== undefined ? data.is_active : 1]
        );
    });

    // Return newly created branch
    const [newBranch] = await query('SELECT * FROM branches WHERE tenant_id = ? ORDER BY id DESC LIMIT 1', [data.tenantId]);
    return newBranch[0];
};

const update = async (id, data) => {
    await withTransaction(async (conn) => {
        if (data.is_main) {
            await conn.query('UPDATE branches SET is_main = 0 WHERE tenant_id = ? AND id != ?', [data.tenantId, id]);
        }

        const updates = [];
        const params = [];
        ['name', 'address', 'phone', 'is_main', 'is_active'].forEach(field => {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(data[field]);
            }
        });

        if (updates.length > 0) {
            params.push(id, data.tenantId);
            await conn.query(`UPDATE branches SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
        }
    });

    const [updated] = await query('SELECT * FROM branches WHERE id = ? AND tenant_id = ?', [id, data.tenantId]);
    return updated[0];
};

const remove = async (tenantId, branchId) => {
    // Should fail if it has active transfers or inventory, guarded by foreign keys if defined, or handled here.
    const [branch] = await query('SELECT * FROM branches WHERE id = ? AND tenant_id = ?', [branchId, tenantId]);
    if (branch.length > 0 && branch[0].is_main) {
        throw new Error('Cannot delete the main branch. Set another branch as main first.');
    }
    await query('DELETE FROM branches WHERE id = ? AND tenant_id = ?', [branchId, tenantId]);
    return true;
};

// --- Transfers ---

const getTransfers = async (tenantId) => {
    const [transfers] = await query(`
        SELECT t.*, 
            u.first_name as created_by_name,
            b1.name as from_branch_name,
            b2.name as to_branch_name
        FROM branch_transfers t
        JOIN branches b1 ON t.from_branch = b1.id
        JOIN branches b2 ON t.to_branch = b2.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.tenant_id = ?
        ORDER BY t.created_at DESC
    `, [tenantId]);
    return transfers;
};

const createTransfer = async (tenantId, userId, data) => {
    /* items format expected: [{ product_id: 1, quantity: 5 }, ...] */
    let transferId;

    await withTransaction(async (conn) => {
        // Find warehouse names for these branches
        const [branches] = await conn.query('SELECT id, name FROM branches WHERE id IN (?, ?) AND tenant_id = ?', [data.from_branch, data.to_branch, tenantId]);

        const fromBranch = branches.find(b => String(b.id) === String(data.from_branch));
        const toBranch = branches.find(b => String(b.id) === String(data.to_branch));

        if (!fromBranch || !toBranch) throw new Error('Invalid source or destination branch');

        // Verify stock in fromBranch
        for (const item of data.items) {
            const [stockRows] = await conn.query(
                'SELECT quantity, id FROM inventory WHERE tenant_id = ? AND product_id = ? AND warehouse = ? FOR UPDATE',
                [tenantId, item.product_id, fromBranch.name]
            );

            const currentStock = stockRows.length ? stockRows[0].quantity : 0;
            if (currentStock < item.quantity) {
                const [prod] = await conn.query('SELECT name FROM products WHERE id = ?', [item.product_id]);
                throw new Error(`Insufficient stock for ${prod[0]?.name || 'product'} in ${fromBranch.name}. Have: ${currentStock}, Requested: ${item.quantity}`);
            }
        }

        // Create transfer record
        const [res] = await conn.query(
            `INSERT INTO branch_transfers 
            (tenant_id, from_branch, to_branch, status, created_by, items) 
            VALUES (?, ?, ?, 'PENDING', ?, ?)`,
            [tenantId, data.from_branch, data.to_branch, userId, JSON.stringify(data.items)]
        );
        transferId = res.insertId;

        // Deduct from source branch IMMEDIATELY (it's reserved/in-transit now)
        for (const item of data.items) {
            await conn.query(
                'UPDATE inventory SET quantity = quantity - ? WHERE tenant_id = ? AND product_id = ? AND warehouse = ?',
                [item.quantity, tenantId, item.product_id, fromBranch.name]
            );

            // Log removal for transit
            await conn.query(`
                INSERT INTO inventory_movements 
                (tenant_id, product_id, type, quantity, reference_type, reference_id, warehouse, notes, created_by)
                VALUES (?, ?, 'OUT', ?, 'TRANSFER', ?, ?, ?, ?)`,
                [tenantId, item.product_id, item.quantity, transferId, fromBranch.name, `Transfer sent to ${toBranch.name}`, userId]
            );
        }
    });

    const [transfers] = await query('SELECT * FROM branch_transfers WHERE id = ?', [transferId]);
    return transfers[0];
};

const updateTransferStatus = async (tenantId, userId, transferId, status) => {
    return await withTransaction(async (conn) => {
        const [rows] = await conn.query('SELECT * FROM branch_transfers WHERE id = ? AND tenant_id = ? FOR UPDATE', [transferId, tenantId]);
        if (!rows.length) throw new Error('Transfer not found');
        const transfer = rows[0];

        if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
            throw new Error(`Cannot update a transfer that is already ${transfer.status}`);
        }

        // Get branch names
        const [branches] = await conn.query('SELECT id, name FROM branches WHERE id IN (?, ?)', [transfer.from_branch, transfer.to_branch]);
        const fromBranch = branches.find(b => String(b.id) === String(transfer.from_branch)).name;
        const toBranch = branches.find(b => String(b.id) === String(transfer.to_branch)).name;

        const items = typeof transfer.items === 'string' ? JSON.parse(transfer.items) : transfer.items;

        if (status === 'RECEIVED') {
            // Add to destination branch
            for (const item of items) {
                // Check if destination inventory record exists
                const [destInv] = await conn.query('SELECT id FROM inventory WHERE tenant_id = ? AND product_id = ? AND warehouse = ?', [tenantId, item.product_id, toBranch]);

                if (destInv.length) {
                    await conn.query('UPDATE inventory SET quantity = quantity + ?, last_restocked_at = NOW() WHERE id = ?', [item.quantity, destInv[0].id]);
                } else {
                    await conn.query('INSERT INTO inventory (tenant_id, product_id, warehouse, quantity) VALUES (?, ?, ?, ?)', [tenantId, item.product_id, toBranch, item.quantity]);
                }

                // Log addition
                await conn.query(`
                    INSERT INTO inventory_movements 
                    (tenant_id, product_id, type, quantity, reference_type, reference_id, warehouse, notes, created_by)
                    VALUES (?, ?, 'IN', ?, 'TRANSFER', ?, ?, ?, ?)`,
                    [tenantId, item.product_id, item.quantity, transferId, toBranch, `Transfer received from ${fromBranch}`, userId]
                );
            }
        } else if (status === 'CANCELLED') {
            // Revert deduction from source branch
            for (const item of items) {
                await conn.query('UPDATE inventory SET quantity = quantity + ?, last_restocked_at = NOW() WHERE tenant_id = ? AND product_id = ? AND warehouse = ?', [item.quantity, tenantId, item.product_id, fromBranch]);

                // Log revert
                await conn.query(`
                    INSERT INTO inventory_movements 
                    (tenant_id, product_id, type, quantity, reference_type, reference_id, warehouse, notes, created_by)
                    VALUES (?, ?, 'IN', ?, 'TRANSFER', ?, ?, ?, ?)`,
                    [tenantId, item.product_id, item.quantity, transferId, fromBranch, `Transfer cancelled, stock reverted`, userId]
                );
            }
        }

        // Update status
        await conn.query('UPDATE branch_transfers SET status = ? WHERE id = ?', [status, transferId]);

        return { transferId, status };
    });
};

module.exports = {
    getAll, create, update, remove,
    getTransfers, createTransfer, updateTransferStatus
};
