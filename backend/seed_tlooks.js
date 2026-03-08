const { query, pool } = require('./database/connection');

async function seedTlooksMedical() {
    try {
        console.log("Finding Tlooks Medical tenant...");
        const [tenants] = await query("SELECT id FROM tenants WHERE name LIKE '%Tlooks Medical%' OR name LIKE '%Tlooks%' LIMIT 1");
        if (tenants.length === 0) { console.log("Not found."); process.exit(1); }
        const tenantId = tenants[0].id;

        // 1. Categories
        console.log("Seeding Categories...");
        await query("INSERT IGNORE INTO categories (id, tenant_id, name, slug, description) VALUES (101, ?, 'Medicines', 'medicines', 'Prescription and OTC medicines')", [tenantId]);
        await query("INSERT IGNORE INTO categories (id, tenant_id, name, slug, description) VALUES (102, ?, 'Medical Supplies', 'medical-supplies', 'Bandages, syringes, etc.')", [tenantId]);
        const cat1Id = 101; const cat2Id = 102;

        // 2. Products
        console.log("Seeding Products...");
        await query("INSERT IGNORE INTO products (id, tenant_id, category_id, name, slug, sku, barcode, description, cost_price, selling_price, min_stock_level) VALUES (1001, ?, ?, 'Paracetamol 500mg (Pack of 10)', 'paracetamol-500mg-10', 'MED-PAR-001', '8901234567890', 'Pain reliever and fever reducer', 5.00, 10.00, 50)", [tenantId, cat1Id]);
        await query("INSERT IGNORE INTO products (id, tenant_id, category_id, name, slug, sku, barcode, description, cost_price, selling_price, min_stock_level) VALUES (1002, ?, ?, 'Amoxicillin 250mg', 'amox-250mg', 'MED-AMX-002', '8901234567891', 'Antibiotic', 15.00, 25.00, 20)", [tenantId, cat1Id]);
        await query("INSERT IGNORE INTO products (id, tenant_id, category_id, name, slug, sku, barcode, description, cost_price, selling_price, min_stock_level) VALUES (1003, ?, ?, 'Surgical Masks (Box of 50)', 'surg-masks-50', 'SUP-MSK-001', '8901234567892', 'Disposable surgical face masks', 35.00, 60.00, 10)", [tenantId, cat2Id]);
        const prod1Id = 1001; const prod2Id = 1002; const prod3Id = 1003;

        // 3. Inventory
        console.log("Seeding Inventory...");
        await query("INSERT IGNORE INTO inventory (id, tenant_id, product_id, warehouse, quantity) VALUES (10001, ?, ?, 'main', 500)", [tenantId, prod1Id]);
        await query("INSERT IGNORE INTO inventory (id, tenant_id, product_id, warehouse, quantity) VALUES (10002, ?, ?, 'main', 150)", [tenantId, prod2Id]);
        await query("INSERT IGNORE INTO inventory (id, tenant_id, product_id, warehouse, quantity) VALUES (10003, ?, ?, 'main', 100)", [tenantId, prod3Id]);

        // 4. Customers
        console.log("Seeding Customers...");
        await query("INSERT IGNORE INTO customers (id, tenant_id, name, email, phone, address, loyalty_points) VALUES (1010, ?, 'Walk-in Patient', NULL, NULL, NULL, 0)", [tenantId]);
        await query("INSERT IGNORE INTO customers (id, tenant_id, name, email, phone, address, loyalty_points) VALUES (1011, ?, 'Dr. Abdul Koroma', 'abdul.k@example.com', '+23277112233', 'Connaught Hospital, Freetown', 150)", [tenantId]);
        const cust1Id = 1010; const cust2Id = 1011;

        // 5. Suppliers
        console.log("Seeding Suppliers...");
        await query("INSERT IGNORE INTO suppliers (id, tenant_id, name, contact_person, email, phone, address, is_active) VALUES (2001, ?, 'Global Pharma Co.', 'Ibrahim Jalloh', 'sales@globalpharma.sl', '+23276123456', 'Kissy Road, Freetown', 1)", [tenantId]);
        const sup1Id = 2001;

        // 6. Users
        const [users] = await query("SELECT id FROM users WHERE tenant_id = ? LIMIT 1", [tenantId]);
        let userId = users.length > 0 ? users[0].id : 1;

        // 7. Sales & Sale Items
        console.log("Seeding Sales...");
        await query("INSERT IGNORE INTO sales (id, tenant_id, customer_id, user_id, sale_number, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_status, status) VALUES (3001, ?, ?, ?, 'SALE-T001', 35.00, 0, 0, 35.00, 35.00, 0, 'PAID', 'COMPLETED')", [tenantId, cust1Id, userId]);
        await query("INSERT IGNORE INTO sale_items (id, tenant_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, total) VALUES (4001, ?, 3001, ?, 'Paracetamol 500mg (Pack of 10)', 1, 10.00, 5.00, 10.00)", [tenantId, prod1Id]);
        await query("INSERT IGNORE INTO sale_items (id, tenant_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, total) VALUES (4002, ?, 3001, ?, 'Amoxicillin 250mg', 1, 25.00, 15.00, 25.00)", [tenantId, prod2Id]);
        await query("INSERT IGNORE INTO payments (id, tenant_id, sale_id, method, amount, status) VALUES (5001, ?, 3001, 'CASH', 35.00, 'SUCCESS')", [tenantId]);

        await query("INSERT IGNORE INTO sales (id, tenant_id, customer_id, user_id, sale_number, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_status, status) VALUES (3002, ?, ?, ?, 'SALE-T002', 120.00, 0, 0, 120.00, 120.00, 0, 'PAID', 'COMPLETED')", [tenantId, cust2Id, userId]);
        await query("INSERT IGNORE INTO sale_items (id, tenant_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, total) VALUES (4003, ?, 3002, ?, 'Surgical Masks (Box of 50)', 2, 60.00, 35.00, 120.00)", [tenantId, prod3Id]);
        await query("INSERT IGNORE INTO payments (id, tenant_id, sale_id, method, amount, status) VALUES (5002, ?, 3002, 'MOBILE_MONEY', 120.00, 'SUCCESS')", [tenantId]);

        // 8. Purchase Orders
        console.log("Seeding Purchase Orders...");
        await query("INSERT IGNORE INTO purchase_orders (id, tenant_id, supplier_id, ordered_by, po_number, status, total_amount) VALUES (6001, ?, ?, ?, 'PO-T001', 'RECEIVED', 250.00)", [tenantId, sup1Id, userId]);
        await query("INSERT IGNORE INTO purchase_order_items (id, purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost) VALUES (7001, 6001, ?, 50, 50, 5.00)", [prod1Id]);

        // 9. Expenses
        console.log("Seeding Expenses...");
        try {
            await query("INSERT IGNORE INTO expenses (id, tenant_id, recorded_by, category, amount, description, payment_method, expense_date) VALUES (8001, ?, ?, 'UTILITIES', 150.00, 'Electricity bill for generator', 'CASH', CURDATE())", [tenantId, userId]);
        } catch (e) {
            console.log("Skipping expenses due to error:", e.message);
        }

        // 10. Tax Config
        console.log("Seeding Tax Config...");
        try {
            await query("INSERT IGNORE INTO tax_config (id, tenant_id, name, rate, is_default, is_active) VALUES (9001, ?, 'GST 15%', 15.00, 1, 1)", [tenantId]);
        } catch (e) {
            console.log("Skipping tax config due to error:", e.message);
        }

        // 11. Loyalty Points
        console.log("Seeding Loyalty Points...");
        try {
            await query("INSERT IGNORE INTO loyalty_points (id, tenant_id, customer_id, points, transaction_type, source_id, description) VALUES (9501, ?, ?, 150, 'EARNED', 3002, 'Points earned from SALE-T002')", [tenantId, cust2Id]);
        } catch (e) {
            console.log("Skipping loyalty points due to error:", e.message);
        }

        // 12. Customer Credits
        console.log("Seeding Customer Credits...");
        try {
            await query("INSERT IGNORE INTO customer_credits (id, tenant_id, customer_id, sale_id, amount, balance, status, due_date) VALUES (9601, ?, ?, NULL, 500.00, 500.00, 'UNPAID', DATE_ADD(CURDATE(), INTERVAL 30 DAY))", [tenantId, cust2Id]);
            await query("INSERT IGNORE INTO payments (id, tenant_id, customer_id, method, amount, status, reference) VALUES (9701, ?, ?, 'CASH', 0, 'PENDING', 'Credit tracking record')", [tenantId, cust2Id]);
        } catch (e) {
            console.log("Skipping credits due to error:", e.message);
        }

        console.log("✅ Successfully seeded all medical sample data for Tlooks Medical!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding data:", error);
        process.exit(1);
    }
}

seedTlooksMedical();
