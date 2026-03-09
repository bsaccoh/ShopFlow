const { query, withTransaction } = require('../../database/connection');
const crypto = require('crypto');

const generateSaleNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${dateStr}-${rand}`;
};

const processSale = async (tenantId, userId, saleData) => {
    const { items, customer_id, global_discount, payment_methods, notes, status = 'COMPLETED', branch_id } = saleData;

    return await withTransaction(async (connection) => {
        // 0. Get branch details to find the correct warehouse name
        let preferredWarehouse = 'Main Store'; // Default fallback
        if (branch_id) {
            const [branchRows] = await connection.query('SELECT name FROM branches WHERE id = ? AND tenant_id = ?', [branch_id, tenantId]);
            if (branchRows.length > 0) {
                preferredWarehouse = branchRows[0].name;
            } else {
                // Fallback            if (!branchId) {
                const [mainBranchRows] = await connection.query('SELECT name FROM branches WHERE tenant_id = ? AND is_main = true LIMIT 1', [tenantId]);
                if (mainBranchRows.length > 0) preferredWarehouse = mainBranchRows[0].name;
            }
        } else {
            // Fallback        if (!branchName) {
            const [mainBranchRows] = await connection.query('SELECT name FROM branches WHERE tenant_id = ? AND is_main = true LIMIT 1', [tenantId]);
            if (mainBranchRows.length > 0) preferredWarehouse = mainBranchRows[0].name;
        }
        // 1. Validate constraints & calculate totals
        let subtotal = 0;
        let totalTax = 0;

        // Fetch current product prices and stock to prevent tampering
        const processedItems = [];

        for (const item of items) {
            const [productRows] = await connection.query(`
        SELECT p.id, p.name, p.selling_price, p.cost_price, p.tax_rate, p.is_active
        FROM products p
        WHERE p.id = ? AND p.tenant_id = ? FOR UPDATE
      `, [item.product_id, tenantId]);

            if (productRows.length === 0 || !productRows[0].is_active) {
                throw new Error(`Product ID ${item.product_id} is invalid or inactive`);
            }

            const product = productRows[0];
            const [invRows] = await connection.query(`
                SELECT id, warehouse, quantity
                FROM inventory
                WHERE tenant_id = ? AND product_id = ? AND warehouse IN (?, 'main')
                ORDER BY CASE
                    WHEN warehouse = ? THEN 0
                    WHEN warehouse = 'main' THEN 1
                    ELSE 2
                END
                LIMIT 1
                FOR UPDATE
            `, [tenantId, item.product_id, preferredWarehouse, preferredWarehouse]);

            const inventoryRow = invRows[0] || null;
            console.log(`[Sales Debug] Product ID ${item.product_id}: Inventory row found = `, inventoryRow);
            const currentStock = inventoryRow ? Number(inventoryRow.quantity || 0) : 0;
            const stockWarehouse = inventoryRow?.warehouse || preferredWarehouse;
            console.log(`[Sales Debug] Current Stock for ${product.name}: ${currentStock}, Requested: ${item.quantity}`);

            if (status !== 'HELD' && currentStock < item.quantity) {
                console.error(`[Sales Debug] Throwing insufficient stock error for ${product.name}. Available: ${currentStock}`);
                throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}`);
            }

            // Calculate item totals
            const unitPrice = parseFloat(product.selling_price);
            let itemTotal = unitPrice * item.quantity;
            let lineDiscount = 0;

            if (item.discount_type === 'FIXED') {
                lineDiscount = parseFloat(item.discount_value) * item.quantity;
            } else if (item.discount_type === 'PERCENTAGE') {
                lineDiscount = itemTotal * (parseFloat(item.discount_value) / 100);
            }

            const itemAfterDiscount = itemTotal - lineDiscount;
            const taxAmount = itemAfterDiscount * (parseFloat(product.tax_rate) / 100);

            processedItems.push({
                ...item,
                name: product.name,
                cost_price: product.cost_price,
                unit_price: unitPrice,
                tax_rate: product.tax_rate,
                tax_amount: taxAmount,
                discount_amount: lineDiscount,
                total: itemAfterDiscount + taxAmount,
                inventory_id: inventoryRow?.id || null,
                stock_warehouse: stockWarehouse
            });

            subtotal += itemTotal;
            totalTax += taxAmount;
        }

        // Apply global discount if any
        let totalDiscount = processedItems.reduce((acc, item) => acc + item.discount_amount, 0);

        // Calculate final totals
        const totalAmount = subtotal - totalDiscount + totalTax;

        // Validate payments if status is COMPLETED
        let paidAmount = 0;
        let changeAmount = 0;
        let paymentStatus = 'PENDING';

        if (status === 'COMPLETED' && payment_methods && payment_methods.length > 0) {
            paidAmount = payment_methods.reduce((acc, pm) => acc + parseFloat(pm.amount), 0);

            // Allow change only if all payments are CASH
            const isOnlyCash = payment_methods.every(pm => pm.method === 'CASH');

            if (paidAmount < totalAmount) {
                paymentStatus = 'PARTIAL';
            } else if (paidAmount >= totalAmount) {
                paymentStatus = 'PAID';
                if (isOnlyCash) {
                    changeAmount = paidAmount - totalAmount;
                } else if (paidAmount > totalAmount) {
                    throw new Error('Overpayment is only allowed for CASH transactions');
                }
            }
        }

        const saleNumber = generateSaleNumber();

        // 2. Insert Sale Record
        const [saleResult] = await connection.query(`
      INSERT INTO sales 
      (tenant_id, customer_id, user_id, branch_id, sale_number, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_status, status, notes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END)
    `, [
            tenantId, customer_id || null, userId, branch_id || null, saleNumber, subtotal, totalTax, totalDiscount, totalAmount, paidAmount, changeAmount, paymentStatus, status, notes || null, status
        ]);

        const saleId = saleResult.insertId;

        // 3. Insert Sale Items & Deduct Stock
        for (const item of processedItems) {
            await connection.query(`
        INSERT INTO sale_items 
        (tenant_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                tenantId, saleId, item.product_id, item.name, item.quantity, item.unit_price, item.cost_price,
                item.discount_type || 'NONE', item.discount_value || 0, item.discount_amount,
                item.tax_rate, item.tax_amount, item.total
            ]);

            if (status === 'COMPLETED') {
                if (!item.inventory_id) {
                    throw new Error(`Insufficient stock for ${item.name}. Available: 0`);
                }
                // Deduct inventory
                await connection.query(`
          UPDATE inventory SET quantity = quantity - ? WHERE id = ?
        `, [item.quantity, item.inventory_id]);

                // Log movement
                await connection.query(`
          INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reference_type, reference_id, warehouse, created_by)
          VALUES (?, ?, 'OUT', ?, 'SALE', ?, ?, ?)
        `, [tenantId, item.product_id, item.quantity, saleId, item.stock_warehouse, userId]);
            }
        }

        // 4. Insert Payments
        if (status === 'COMPLETED' && payment_methods) {
            for (const pm of payment_methods) {
                // If it's a mobile money request, the status would be PENDING until webhook confirms,
                // but for now we write the skeleton logic assuming success for simplicity, or pending for others
                const pmStatus = pm.method === 'MOBILE_MONEY' ? 'PENDING' : 'SUCCESS';

                await connection.query(`
          INSERT INTO payments (tenant_id, sale_id, method, amount, reference, provider, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, saleId, pm.method, pm.amount, pm.reference || null, pm.provider || null, pmStatus]);

                if (pm.method === 'CREDIT') {
                    if (!customer_id) throw new Error('Customer is required for credit sales');
                    await connection.query(`
                        INSERT INTO customer_credits (tenant_id, customer_id, sale_id, type, amount, description, recorded_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [tenantId, customer_id, saleId, 'CREDIT', pm.amount, `Credit from sale ${saleNumber}`, userId]);
                }
            }
        }

        // 5. Update Customer Loyalty Points
        if (customer_id && status === 'COMPLETED') {
            const pointsEarned = Math.floor(totalAmount / 10); // 1 point per 10 currency unit
            if (pointsEarned > 0) {
                await connection.query('UPDATE customers SET loyalty_points = loyalty_points + ?, total_spent = total_spent + ? WHERE id = ? AND tenant_id = ?',
                    [pointsEarned, totalAmount, customer_id, tenantId]);

                await connection.query('INSERT INTO loyalty_points (tenant_id, customer_id, sale_id, points, type, description) VALUES (?, ?, ?, ?, ?, ?)',
                    [tenantId, customer_id, saleId, pointsEarned, 'EARNED', `Points from sale ${saleNumber}`]);
            }
        }

        return {
            saleId,
            saleNumber,
            totalAmount,
            status,
            paymentStatus
        };
    });
};

const getHistory = async (tenantId, filters) => {
    let sql = `
    SELECT s.id, s.sale_number, s.total_amount, s.payment_status, s.status, s.created_at,
           c.name as customer_name, u.first_name as cashier_first, u.last_name as cashier_last,
           (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id AND tenant_id = s.tenant_id) as total_items,
           (SELECT STRING_AGG(product_name || ' (x' || quantity || ')', ', ') FROM sale_items WHERE sale_id = s.id AND tenant_id = s.tenant_id) as items_summary
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.tenant_id = ?
  `;
    const params = [tenantId];

    if (filters.cashierId) {
        sql += ' AND s.user_id = ?';
        params.push(filters.cashierId);
    }

    if (filters.status) {
        sql += ' AND s.status = ?';
        params.push(filters.status);
    }

    if (filters.paymentStatus) {
        sql += ' AND s.payment_status = ?';
        params.push(filters.paymentStatus);
    }

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const [sales] = await query(sql, params);

    // Get total count for pagination
    const [countRows] = await query('SELECT COUNT(*) as total FROM sales WHERE tenant_id = ?', [tenantId]); // Needs filter sync for real app

    return {
        data: sales,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            total: countRows.total
        }
    };
};

const getDetails = async (tenantId, saleId) => {
    const [sales] = await query(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
           u.first_name, u.last_name, t.name as tenant_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN tenants t ON s.tenant_id = t.id
    WHERE s.tenant_id = ? AND s.id = ?
  `, [tenantId, saleId]);

    if (!sales || sales.length === 0) return null;

    const [items] = await query(`
    SELECT * FROM sale_items WHERE tenant_id = ? AND sale_id = ?
  `, [tenantId, saleId]);

    const [payments] = await query(`
    SELECT id, method, amount, status, reference, created_at FROM payments WHERE tenant_id = ? AND sale_id = ?
  `, [tenantId, saleId]);

    return {
        sale: sales[0],
        items,
        payments
    };
};

const voidTransaction = async (tenantId, saleId, userId, reason) => {
    return await withTransaction(async (connection) => {
        // 1. Mark sale as VOIDED
        await connection.query("UPDATE sales SET status = 'VOIDED', notes = CONCAT(COALESCE(notes, ''), ' | Voided: ', CAST(? AS TEXT)) WHERE id = ? AND tenant_id = ?", [reason, saleId, tenantId]);

        // 2. Reverse Inventory
        const [items] = await connection.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [saleId]);

        for (const item of items) {
            // Add back to inventory
            await connection.query('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND tenant_id = ? AND warehouse = "main"', [item.quantity, item.product_id, tenantId]);

            // Log movement
            await connection.query(`
          INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reference_type, reference_id, created_by, notes)
          VALUES (?, ?, 'IN', ?, 'SALE_VOID', ?, ?, ?)
         `, [tenantId, item.product_id, item.quantity, saleId, userId, 'Voided Sale Reversal']);
        }

        // 3. Mark Payments as Refunded
        await connection.query('UPDATE payments SET status = "REFUNDED" WHERE sale_id = ? AND tenant_id = ?', [saleId, tenantId]);

        return { success: true, saleId };
    });
};

module.exports = {
    processSale,
    getHistory,
    getDetails,
    voidTransaction
};
