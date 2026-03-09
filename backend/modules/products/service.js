const { query, withTransaction } = require('../../database/connection');

const getAll = async (tenantId, filters = {}) => {
    const warehouse = filters.warehouse || 'main'; // Use specified warehouse or fallback
    let sql = `
    SELECT p.*, c.name as category_name,
           COALESCE(iw.quantity, im.quantity, 0) as quantity,
           COALESCE(iw.quantity, im.quantity, 0) as stock_quantity,
           COALESCE(iw.warehouse, im.warehouse, 'main') as stock_warehouse
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory iw ON p.id = iw.product_id AND iw.tenant_id = p.tenant_id AND iw.warehouse = ?
    LEFT JOIN inventory im ON p.id = im.product_id AND im.tenant_id = p.tenant_id AND im.warehouse = 'main'
    WHERE p.tenant_id = ? AND p.is_active = true
  `;
    const params = [warehouse, tenantId];

    if (filters.categoryId) {
        sql += ' AND p.category_id = ?';
        params.push(filters.categoryId);
    }

    if (filters.search) {
        sql += ' AND (p.name LIKE ? OR p.barcode = ? OR p.sku = ?)';
        params.push(`%${filters.search}%`, filters.search, filters.search);
    }

    if (filters.stockLow) {
        sql += ' AND COALESCE(iw.quantity, im.quantity, 0) <= p.min_stock_level';
    }

    sql += ' ORDER BY p.name ASC';
    const [products] = await query(sql, params);
    return products;
};

const getById = async (tenantId, id, warehouse = 'main') => {
    const [rows] = await query(`
    SELECT p.*, c.name as category_name,
           COALESCE(iw.quantity, im.quantity, 0) as quantity,
           COALESCE(iw.quantity, im.quantity, 0) as stock_quantity,
           COALESCE(iw.warehouse, im.warehouse, 'main') as stock_warehouse
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory iw ON p.id = iw.product_id AND iw.tenant_id = p.tenant_id AND iw.warehouse = ?
    LEFT JOIN inventory im ON p.id = im.product_id AND im.tenant_id = p.tenant_id AND im.warehouse = 'main'
    WHERE p.tenant_id = ? AND p.id = ?
  `, [warehouse, tenantId, id]);
    return rows[0] || null;
};

const getByBarcode = async (tenantId, barcode, warehouse = 'main') => {
    const [rows] = await query(`
    SELECT p.*,
           COALESCE(iw.quantity, im.quantity, 0) as quantity,
           COALESCE(iw.quantity, im.quantity, 0) as stock_quantity,
           COALESCE(iw.warehouse, im.warehouse, 'main') as stock_warehouse
    FROM products p
    LEFT JOIN inventory iw ON p.id = iw.product_id AND iw.tenant_id = p.tenant_id AND iw.warehouse = ?
    LEFT JOIN inventory im ON p.id = im.product_id AND im.tenant_id = p.tenant_id AND im.warehouse = 'main'
    WHERE p.tenant_id = ? AND p.barcode = ? AND p.is_active = true
  `, [warehouse, tenantId, barcode]);
    return rows[0] || null;
};

const create = async (tenantId, data) => {
    return await withTransaction(async (connection) => {
        // 1. Create Product
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Check uniqueness of barcode if provided
        if (data.barcode) {
            const existing = await connection.query('SELECT id FROM products WHERE tenant_id = ? AND barcode = ?', [tenantId, data.barcode]);
            if (existing[0].length > 0) throw new Error('Product with this barcode already exists');
        }

        const [result] = await connection.query(`
      INSERT INTO products 
      (tenant_id, category_id, supplier_id, name, slug, sku, barcode, description, cost_price, selling_price, tax_rate, discount_type, discount_value, min_stock_level, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            tenantId,
            data.category_id || null,
            data.supplier_id || null,
            data.name,
            slug,
            data.sku || null,
            data.barcode || null,
            data.description || null,
            data.cost_price || 0,
            data.selling_price || 0,
            data.tax_rate || 0,
            data.discount_type || 'NONE',
            data.discount_value || 0,
            data.min_stock_level || 0,
            data.image_url || null
        ]);

        const productId = result.insertId;

        // 2. Initialize Inventory for the specified or main branch
        const initialQuantity = parseInt(data.initial_stock) || 0;
        const branchId = data.branch_id || null;
        let warehouseName = data.warehouse || 'main';

        if (branchId) {
            const [branch] = await connection.query('SELECT name FROM branches WHERE id = ? AND tenant_id = ?', [branchId, tenantId]);
            if (branch.length > 0) warehouseName = branch[0].name;
        }

        const [invResult] = await connection.query(`
      INSERT INTO inventory (tenant_id, product_id, warehouse, quantity) 
      VALUES (?, ?, ?, ?)
    `, [tenantId, productId, warehouseName, initialQuantity]);

        // 3. Log initial stock movement if > 0
        if (initialQuantity > 0) {
            await connection.query(`
        INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reference_type, notes)
        VALUES (?, ?, 'IN', ?, 'INITIAL_STOCK', 'Product Creation')
      `, [tenantId, productId, initialQuantity]);
        }

        return {
            product: { id: productId, ...data, slug },
            inventory: { id: invResult.insertId, quantity: initialQuantity }
        };
    });
};

const update = async (tenantId, id, data) => {
    const allowed = [
        'category_id', 'supplier_id', 'name', 'sku', 'barcode', 'description',
        'cost_price', 'selling_price', 'tax_rate', 'discount_type', 'discount_value',
        'min_stock_level', 'image_url', 'is_active'
    ];

    const updates = [];
    const values = [];

    allowed.forEach(field => {
        if (data[field] !== undefined) {
            if (field === 'name') {
                const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                updates.push('name = ?', 'slug = ?');
                values.push(data.name, slug);
            } else {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
    });

    if (updates.length > 0) {
        values.push(tenantId, id);
        await query(`UPDATE products SET ${updates.join(', ')} WHERE tenant_id = ? AND id = ?`, values);
    }

    return await getById(tenantId, id);
};

const remove = async (tenantId, id) => {
    const result = await query('UPDATE products SET is_active = false WHERE tenant_id = ? AND id = ?', [tenantId, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAll,
    getById,
    getByBarcode,
    create,
    update,
    remove
};
