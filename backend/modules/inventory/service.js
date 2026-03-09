const { query, withTransaction } = require('../../database/connection');

const getLevels = async (tenantId, filters) => {
    let sql = `
    SELECT i.id, p.id as product_id, i.warehouse, COALESCE(i.quantity, 0) as quantity, i.last_restocked_at,
           p.name as product_name, p.sku, p.barcode, p.min_stock_level
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id AND i.warehouse = ?
    WHERE p.tenant_id = ? AND p.is_active = true
  `;
    const params = [filters.warehouse, tenantId];

    if (filters.search) {
        sql += ' AND (p.name ILIKE ? OR p.barcode = ? OR p.sku = ?)';
        params.push(`%${filters.search}%`, filters.search, filters.search);
    }

    sql += ' ORDER BY p.name ASC';
    const [levels] = await query(sql, params);
    return levels;
};

const getMovements = async (tenantId, filters) => {
    let sql = `
    SELECT m.id, m.product_id, m.type, m.quantity, m.reference_type, m.reference_id, m.notes, m.created_at,
           p.name as product_name, u.first_name, u.last_name
    FROM inventory_movements m
    JOIN products p ON m.product_id = p.id
    LEFT JOIN users u ON m.created_by = u.id
    WHERE m.tenant_id = ?
  `;
    const params = [tenantId];

    if (filters.productId) {
        sql += ' AND m.product_id = ?';
        params.push(filters.productId);
    }

    if (filters.type) {
        sql += ' AND m.type = ?';
        params.push(filters.type);
    }

    if (filters.startDate && filters.endDate) {
        sql += ' AND m.created_at BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate + ' 23:59:59');
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const [movements] = await query(sql, params);
    return movements;
};

const adjust = async (tenantId, userId, data) => {
    return await withTransaction(async (connection) => {
        // 1. Get current inventory
        const [invRows] = await connection.query(
            'SELECT id, quantity FROM inventory WHERE tenant_id = ? AND product_id = ? AND warehouse = ? FOR UPDATE',
            [tenantId, data.product_id, data.warehouse]
        );

        let currentQty = 0;
        let invId = null;

        if (invRows.length > 0) {
            currentQty = invRows[0].quantity;
            invId = invRows[0].id;
        } else {
            // Create inventory record if it doesn't exist for this warehouse
            const [insertResult] = await connection.query(
                'INSERT INTO inventory (tenant_id, product_id, warehouse, quantity) VALUES (?, ?, ?, 0)',
                [tenantId, data.product_id, data.warehouse]
            );
            invId = insertResult.insertId;
        }

        // 2. Calculate new quantity
        let newQty = currentQty;
        let movementQty = 0;

        if (data.adjustment_type === 'ADD') {
            newQty = currentQty + data.quantity;
            movementQty = data.quantity;
        } else if (data.adjustment_type === 'REMOVE') {
            if (currentQty < data.quantity) throw new Error('Insufficient stock for this adjustment');
            newQty = currentQty - data.quantity;
            movementQty = data.quantity; // positive number for tracking
        } else if (data.adjustment_type === 'SET') {
            newQty = data.quantity;
            movementQty = Math.abs(newQty - currentQty);
        }

        // 3. Update inventory
        await connection.query(
            'UPDATE inventory SET quantity = ?, last_restocked_at = CASE WHEN ? = \'ADD\' THEN CURRENT_TIMESTAMP ELSE last_restocked_at END WHERE id = ?',
            [newQty, data.adjustment_type, invId]
        );

        // 4. Log in stock adjustments table
        await connection.query(`
      INSERT INTO stock_adjustments 
      (tenant_id, product_id, user_id, adjustment_type, quantity, previous_quantity, new_quantity, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [tenantId, data.product_id, userId, data.adjustment_type, movementQty, currentQty, newQty, data.reason || null]);

        // 5. Log in inventory movements table
        const movType = (data.adjustment_type === 'ADD' || (data.adjustment_type === 'SET' && newQty > currentQty)) ? 'IN' : 'OUT';

        await connection.query(`
      INSERT INTO inventory_movements 
      (tenant_id, product_id, type, quantity, reference_type, warehouse, notes, created_by)
      VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?)
    `, [tenantId, data.product_id, movType, movementQty, data.warehouse, data.reason || 'Manual stock adjustment', userId]);

        return {
            productId: data.product_id,
            warehouse: data.warehouse,
            previousQuantity: currentQty,
            newQuantity: newQty
        };
    });
};

module.exports = {
    getLevels,
    getMovements,
    adjust
};
