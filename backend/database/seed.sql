-- ============================================
-- Seed Data for Multi-Tenant POS
-- WARNING: Run only on a fresh database
-- ============================================

USE multi_tenant_pos;

-- 1. Create Subscription Plans
INSERT IGNORE INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_users, max_products, max_branches, has_api_access, has_advanced_reports, has_multi_warehouse, has_mobile_money, sort_order) VALUES
(1, 'Starter', 'starter', 'For small shops and solo entrepreneurs', 500.00, 5000.00, 3, 1000, 1, 0, 0, 0, 1, 1),
(2, 'Business', 'business', 'For growing retail businesses', 1200.00, 12000.00, 10, 5000, 3, 1, 1, 1, 1, 2),
(3, 'Enterprise', 'enterprise', 'For large chain stores and operations', 3000.00, 30000.00, 999, 99999, 10, 1, 1, 1, 1, 3);

-- 2. Create Default Super Admin (password: SuperAdmin@2024! - hashed with bcrypt)
INSERT IGNORE INTO super_admins (id, email, password_hash, first_name, last_name, is_active)
VALUES (1, 'admin@babahpos.com', '$2y$10$w/A2cIeQ7VwB6D.K1l5P8u9b0Lg8V2fH6ZxC3P9H8O/L7Kq3x5EGy', 'Babah', 'Admin', 1);

-- 3. Create Demo Tenant
INSERT IGNORE INTO tenants (id, name, slug, email, phone, address, city, currency, is_active) 
VALUES (1, 'Demo Shop Retail', 'demo-shop', 'demo@demoshop.com', '+23277000000', '123 Siaka Stevens St', 'Freetown', 'SLE', 1);

-- 4. Create Subscription for Demo Tenant (Active Business Plan)
INSERT IGNORE INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end)
VALUES (1, 1, 2, 'ACTIVE', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH));

-- 5. Create Roles for Demo Tenant
INSERT IGNORE INTO roles (id, tenant_id, name, slug, description, is_system) VALUES 
(1, 1, 'Administrator', 'admin', 'Full access to all features', 1),
(2, 1, 'Manager', 'manager', 'Access to mostly everything except billing', 1),
(3, 1, 'Cashier', 'cashier', 'Access to POS and Sales only', 1),
(4, 1, 'Inventory Manager', 'inventory_manager', 'Access to products, inventory, suppliers, and purchase orders', 1);

-- 6. Create Demo Users for Demo Tenant (password: Password123! - hashed)
INSERT IGNORE INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, is_active)
VALUES 
(1, 1, 1, 'admin@demoshop.com', '$2y$10$yX/L6Z4L3x/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie', 'Demo', 'Admin', 1),
(2, 1, 2, 'manager@demoshop.com', '$2y$10$yX/L6Z4L3x/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie', 'Store', 'Manager', 1),
(3, 1, 3, 'cashier@demoshop.com', '$2y$10$yX/L6Z4L3x/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie8P9H8O/L.Q/Ie', 'Point', 'Cashier', 1);

-- 7. Add Categories
INSERT IGNORE INTO categories (id, tenant_id, name, slug, description) VALUES
(1, 1, 'Electronics', 'electronics', 'Mobile phones and accessories'),
(2, 1, 'Groceries', 'groceries', 'Food and beverages'),
(3, 1, 'Clothing', 'clothing', 'Apparel and shoes');

-- 8. Add Sample Products
INSERT IGNORE INTO products (id, tenant_id, category_id, name, slug, sku, barcode, description, cost_price, selling_price, min_stock_level, image_url) VALUES
(1, 1, 1, 'Samsung Galaxy S23', 'samsung-galaxy-s23', 'EL-SM-001', '8806094900010', 'Flagship phone', 12000.00, 15000.00, 5, 'https://placehold.co/400?text=S23'),
(2, 1, 2, 'Coca Cola 500ml', 'coca-cola-500ml', 'GR-BEV-001', '5449000000996', 'Cold beverage', 10.00, 15.00, 50, 'https://placehold.co/400?text=Coke'),
(3, 1, 1, 'iPhone 15 Pro', 'iphone-15-pro', 'EL-AP-002', '195949000223', 'Apple smartphone', 18000.00, 22000.00, 2, 'https://placehold.co/400?text=iPhone');

-- 9. Initialize Inventory for Sample Products (Main Warehouse)
INSERT IGNORE INTO inventory (id, tenant_id, product_id, warehouse, quantity) VALUES
(1, 1, 1, 'main', 20),
(2, 1, 2, 'main', 500),
(3, 1, 3, 'main', 10);

-- 10. Add Sample Customers
INSERT IGNORE INTO customers (id, tenant_id, name, email, phone, address, loyalty_points) VALUES
(1, 1, 'Walk-in Customer', NULL, NULL, NULL, 0),
(2, 1, 'John Doe', 'john.doe@example.com', '+23277123456', '74 King St, Freetown', 150),
(3, 1, 'Jane Smith', 'jane.smith@example.com', '+23277654321', '12 Queen St, Freetown', 300);

-- 11. Add Sample Sales
INSERT IGNORE INTO sales (id, tenant_id, customer_id, user_id, sale_number, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_status, status) VALUES
(1, 1, 1, 3, 'SALE-00001', 30.00, 0, 0, 30.00, 30.00, 0, 'PAID', 'COMPLETED'),
(2, 1, 2, 3, 'SALE-00002', 15000.00, 0, 500.00, 14500.00, 14500.00, 0, 'PAID', 'COMPLETED'),
(3, 1, 3, 2, 'SALE-00003', 22000.00, 0, 0, 22000.00, 10000.00, 0, 'PARTIAL', 'COMPLETED');

-- 12. Add Sample Sale Items
INSERT IGNORE INTO sale_items (id, tenant_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, total) VALUES
(1, 1, 1, 2, 'Coca Cola 500ml', 2, 15.00, 10.00, 30.00),
(2, 1, 2, 1, 'Samsung Galaxy S23', 1, 15000.00, 12000.00, 15000.00),
(3, 1, 3, 3, 'iPhone 15 Pro', 1, 22000.00, 18000.00, 22000.00);

-- 13. Add Sample Payments
INSERT IGNORE INTO payments (id, tenant_id, sale_id, method, amount, status) VALUES
(1, 1, 1, 'CASH', 30.00, 'SUCCESS'),
(2, 1, 2, 'MOBILE_MONEY', 14500.00, 'SUCCESS'),
(3, 1, 3, 'CARD', 10000.00, 'SUCCESS');
