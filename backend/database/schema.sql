-- ============================================
-- Multi-Tenant SaaS POS System
-- Complete MySQL Schema
-- ============================================





-- ============================================
-- GLOBAL TABLES (No tenant_id)
-- ============================================

CREATE TABLE IF NOT EXISTS super_admins (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  country VARCHAR(100) DEFAULT 'Sierra Leone',
  currency VARCHAR(10) DEFAULT 'SLE',
  timezone VARCHAR(50) DEFAULT 'Africa/Freetown',
  logo_url VARCHAR(500) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT NULL,
  settings JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  location TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SLE',
  max_users INT DEFAULT 5,
  max_products INT DEFAULT 100,
  max_branches INT DEFAULT 1,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_advanced_reports BOOLEAN DEFAULT FALSE,
  has_multi_warehouse BOOLEAN DEFAULT FALSE,
  has_mobile_money BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  features JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'TRIAL',
  billing_cycle VARCHAR(50) DEFAULT 'MONTHLY',
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  trial_ends_at DATE NULL,
  cancelled_at TIMESTAMP NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);


CREATE TABLE IF NOT EXISTS system_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  setting_type VARCHAR(50) DEFAULT 'STRING',
  description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS feature_flags (
  id BIGSERIAL PRIMARY KEY,
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  description VARCHAR(500) NULL,
  applies_to VARCHAR(50) DEFAULT 'ALL',
  config JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TENANT-SCOPED TABLES (All include tenant_id)
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description VARCHAR(500) NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, slug)
);


CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, role_id, module, action)
);


CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_id BIGINT NULL,
  branch_id BIGINT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NULL,
  avatar_url VARCHAR(500) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  refresh_token TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, email)
);


CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT NULL,
  parent_id BIGINT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, slug)
);


CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  notes TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  category_id BIGINT NULL,
  supplier_id BIGINT NULL,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(150) NULL,
  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  description TEXT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_type VARCHAR(50) DEFAULT 'NONE',
  discount_value DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'piece',
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT 0,
  image_url VARCHAR(500) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  loyalty_points INT DEFAULT 0,
  total_spent DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  warehouse VARCHAR(100) DEFAULT 'main',
  quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  last_restocked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, product_id, warehouse)
);


CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT NULL,
  warehouse VARCHAR(100) DEFAULT 'main',
  notes TEXT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  branch_id BIGINT NULL,
  sale_number VARCHAR(50) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  status VARCHAR(50) DEFAULT 'COMPLETED',
  notes TEXT NULL,
  held_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(300) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(50) DEFAULT 'NONE',
  discount_value DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  method VARCHAR(50) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference VARCHAR(255) NULL,
  status VARCHAR(50) DEFAULT 'SUCCESS',
  provider VARCHAR(50) NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  branch_id BIGINT NULL,
  purchase_number VARCHAR(50) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'DRAFT',
  expected_date DATE NULL,
  received_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  purchase_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_cost DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS returns (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  return_number VARCHAR(50) NOT NULL,
  sale_id BIGINT NOT NULL,
  customer_id BIGINT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  refund_amount DECIMAL(14,2) DEFAULT 0,
  refund_method VARCHAR(50) DEFAULT 'CASH',
  processed_by BIGINT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);


CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  branch_id BIGINT NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  previous_quantity INT NOT NULL DEFAULT 0,
  new_quantity INT NOT NULL DEFAULT 0,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NULL,
  user_id BIGINT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  record_id BIGINT NULL,
  old_data JSONB NULL,
  new_data JSONB NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS loyalty_points (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  points INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  provider VARCHAR(50) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  external_transaction_id VARCHAR(255) NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'SLE',
  status VARCHAR(50) DEFAULT 'PENDING',
  provider_response JSONB NULL,
  webhook_received_at TIMESTAMP NULL,
  verified_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS tenant_payment_configs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_key VARCHAR(500) NULL,
  secret_key VARCHAR(500) NULL,
  webhook_secret VARCHAR(500) NULL,
  business_number VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, provider)
);



-- ========================
-- Purchase Orders
-- ========================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  po_number VARCHAR(50) NOT NULL,
  supplier_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',
  total_amount DECIMAL(14,2) DEFAULT 0,
  notes TEXT NULL,
  ordered_by BIGINT NULL,
  received_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);


CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);



CREATE TABLE IF NOT EXISTS return_items (
  id BIGSERIAL PRIMARY KEY,
  return_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);


-- ========================
-- Discounts / Coupons
-- ========================
CREATE TABLE IF NOT EXISTS discounts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
  value DECIMAL(14,2) NOT NULL,
  min_order_amount DECIMAL(14,2) DEFAULT 0,
  max_uses INT NULL,
  used_count INT DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


-- ========================
-- Expenses
-- ========================
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  reference VARCHAR(255) NULL,
  recorded_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


-- ========================
-- Cash Register Sessions
-- ========================
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  opened_by BIGINT NOT NULL,
  closed_by BIGINT NULL,
  opening_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  expected_cash DECIMAL(14,2) DEFAULT 0,
  actual_cash DECIMAL(14,2) NULL,
  difference DECIMAL(14,2) NULL,
  total_sales DECIMAL(14,2) DEFAULT 0,
  total_transactions INT DEFAULT 0,
  notes TEXT NULL,
  status VARCHAR(50) DEFAULT 'OPEN',
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


-- ========================
-- Store Settings (key-value)
-- ========================
CREATE TABLE IF NOT EXISTS store_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, setting_key)
);


-- ========================
-- Customer Credits/Debts
-- ========================
CREATE TABLE IF NOT EXISTS customer_credits (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description VARCHAR(500) NULL,
  recorded_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);


-- ========================
-- Tax Configuration
-- ========================
CREATE TABLE IF NOT EXISTS tax_config (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


-- ============================================
-- POSTGRESQL INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants (is_active);
CREATE INDEX IF NOT EXISTS idx_sub_tenant ON subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_sub_period_end ON subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_created ON roles (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_perm_tenant_id ON permissions (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_perm_tenant_created ON permissions (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_created ON users (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cat_tenant_id ON categories (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_cat_tenant_created ON categories (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sup_tenant_id ON suppliers (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_sup_tenant_created ON suppliers (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prod_tenant_id ON products (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_prod_tenant_created ON products (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prod_barcode ON products (tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_prod_sku ON products (tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_cust_tenant_id ON customers (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_cust_tenant_created ON customers (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inv_tenant_id ON inventory (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_inv_tenant_created ON inventory (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invmov_tenant_id ON inventory_movements (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_invmov_tenant_created ON inventory_movements (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON sales (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales (tenant_id, sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sitems_tenant_id ON sale_items (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_sitems_tenant_created ON sale_items (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pay_tenant_id ON payments (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_pay_tenant_created ON payments (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purch_tenant_id ON purchases (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_purch_tenant_created ON purchases (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pitems_tenant_id ON purchase_items (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_pitems_tenant_created ON purchase_items (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ret_tenant_id ON returns (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_ret_tenant_created ON returns (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sadj_tenant_id ON stock_adjustments (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_sadj_tenant_created ON stock_adjustments (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON audit_logs (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs (tenant_id, module);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_lp_tenant_id ON loyalty_points (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_lp_tenant_created ON loyalty_points (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mmt_tenant_id ON mobile_money_transactions (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_mmt_tenant_created ON mobile_money_transactions (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mmt_status ON mobile_money_transactions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mmt_external ON mobile_money_transactions (external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_tpc_tenant_id ON tenant_payment_configs (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_tpc_tenant_created ON tenant_payment_configs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_tenant ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_return_tenant ON returns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_status ON returns (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_discount_tenant ON discounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_code ON discounts (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_expense_tenant ON expenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses (tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_crs_tenant ON cash_register_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crs_status ON cash_register_sessions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cc_customer ON customer_credits (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_tax_tenant ON tax_config (tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches (tenant_id);
