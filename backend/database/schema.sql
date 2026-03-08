-- ============================================
-- Multi-Tenant SaaS POS System
-- Complete MySQL Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS multi_tenant_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE multi_tenant_pos;

-- ============================================
-- GLOBAL TABLES (No tenant_id)
-- ============================================

CREATE TABLE IF NOT EXISTS super_admins (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
  is_active TINYINT(1) DEFAULT 1,
  is_suspended TINYINT(1) DEFAULT 0,
  suspension_reason TEXT NULL,
  settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug (slug),
  INDEX idx_tenants_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SLE',
  max_users INT DEFAULT 5,
  max_products INT DEFAULT 100,
  max_branches INT DEFAULT 1,
  has_api_access TINYINT(1) DEFAULT 0,
  has_advanced_reports TINYINT(1) DEFAULT 0,
  has_multi_warehouse TINYINT(1) DEFAULT 0,
  has_mobile_money TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  features JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  status ENUM('ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'TRIAL') DEFAULT 'TRIAL',
  billing_cycle ENUM('MONTHLY', 'YEARLY') DEFAULT 'MONTHLY',
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  trial_ends_at DATE NULL,
  cancelled_at DATETIME NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_sub_tenant (tenant_id),
  INDEX idx_sub_status (status),
  INDEX idx_sub_period_end (current_period_end)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  setting_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
  description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feature_flags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  is_enabled TINYINT(1) DEFAULT 0,
  description VARCHAR(500) NULL,
  applies_to ENUM('ALL', 'SPECIFIC_PLANS', 'SPECIFIC_TENANTS') DEFAULT 'ALL',
  config JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TENANT-SCOPED TABLES (All include tenant_id)
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description VARCHAR(500) NULL,
  is_system TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_roles_tenant_id (tenant_id, id),
  INDEX idx_roles_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_role_tenant_slug (tenant_id, slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  INDEX idx_perm_tenant_id (tenant_id, id),
  INDEX idx_perm_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_perm_role_module_action (tenant_id, role_id, module, action)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_id BIGINT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NULL,
  avatar_url VARCHAR(500) NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME NULL,
  refresh_token TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  INDEX idx_users_tenant_id (tenant_id, id),
  INDEX idx_users_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_user_tenant_email (tenant_id, email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT NULL,
  parent_id BIGINT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_cat_tenant_id (tenant_id, id),
  INDEX idx_cat_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_cat_tenant_slug (tenant_id, slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(200) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_sup_tenant_id (tenant_id, id),
  INDEX idx_sup_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
  discount_type ENUM('NONE', 'FIXED', 'PERCENTAGE') DEFAULT 'NONE',
  discount_value DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'piece',
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT 0,
  image_url VARCHAR(500) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_prod_tenant_id (tenant_id, id),
  INDEX idx_prod_tenant_created (tenant_id, created_at),
  INDEX idx_prod_barcode (tenant_id, barcode),
  INDEX idx_prod_sku (tenant_id, sku)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  loyalty_points INT DEFAULT 0,
  total_spent DECIMAL(14,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_cust_tenant_id (tenant_id, id),
  INDEX idx_cust_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  warehouse VARCHAR(100) DEFAULT 'main',
  quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  last_restocked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_inv_tenant_id (tenant_id, id),
  INDEX idx_inv_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_inv_tenant_product_wh (tenant_id, product_id, warehouse)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  type ENUM('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER') NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT NULL,
  warehouse VARCHAR(100) DEFAULT 'main',
  notes TEXT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_invmov_tenant_id (tenant_id, id),
  INDEX idx_invmov_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  sale_number VARCHAR(50) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  payment_status ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
  status ENUM('COMPLETED', 'HELD', 'VOIDED', 'REFUNDED') DEFAULT 'COMPLETED',
  notes TEXT NULL,
  held_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_sales_tenant_id (tenant_id, id),
  INDEX idx_sales_tenant_created (tenant_id, created_at),
  INDEX idx_sales_number (tenant_id, sale_number),
  INDEX idx_sales_status (tenant_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(300) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_type ENUM('NONE', 'FIXED', 'PERCENTAGE') DEFAULT 'NONE',
  discount_value DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_sitems_tenant_id (tenant_id, id),
  INDEX idx_sitems_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  method ENUM('CASH', 'CARD', 'MOBILE_MONEY', 'SPLIT') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference VARCHAR(255) NULL,
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'SUCCESS',
  provider VARCHAR(50) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  INDEX idx_pay_tenant_id (tenant_id, id),
  INDEX idx_pay_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  purchase_number VARCHAR(50) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',
  expected_date DATE NULL,
  received_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_purch_tenant_id (tenant_id, id),
  INDEX idx_purch_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_pitems_tenant_id (tenant_id, id),
  INDEX idx_pitems_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS returns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  return_number VARCHAR(50) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  reason TEXT NULL,
  status ENUM('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  INDEX idx_ret_tenant_id (tenant_id, id),
  INDEX idx_ret_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  adjustment_type ENUM('ADD', 'REMOVE', 'SET') NOT NULL,
  quantity INT NOT NULL,
  previous_quantity INT NOT NULL DEFAULT 0,
  new_quantity INT NOT NULL DEFAULT 0,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_sadj_tenant_id (tenant_id, id),
  INDEX idx_sadj_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  user_id BIGINT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  record_id BIGINT NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_tenant_id (tenant_id, id),
  INDEX idx_audit_tenant_created (tenant_id, created_at),
  INDEX idx_audit_module (tenant_id, module),
  INDEX idx_audit_action (tenant_id, action)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loyalty_points (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  points INT NOT NULL,
  type ENUM('EARNED', 'REDEEMED', 'ADJUSTED', 'EXPIRED') NOT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_lp_tenant_id (tenant_id, id),
  INDEX idx_lp_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  provider ENUM('ORANGE', 'AFRIMONEY') NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  external_transaction_id VARCHAR(255) NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'SLE',
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED') DEFAULT 'PENDING',
  provider_response JSON NULL,
  webhook_received_at DATETIME NULL,
  verified_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_mmt_tenant_id (tenant_id, id),
  INDEX idx_mmt_tenant_created (tenant_id, created_at),
  INDEX idx_mmt_status (tenant_id, status),
  INDEX idx_mmt_external (external_transaction_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_payment_configs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  provider ENUM('ORANGE', 'AFRIMONEY', 'STRIPE') NOT NULL,
  api_key VARCHAR(500) NULL,
  secret_key VARCHAR(500) NULL,
  webhook_secret VARCHAR(500) NULL,
  business_number VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  config JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tpc_tenant_id (tenant_id, id),
  INDEX idx_tpc_tenant_created (tenant_id, created_at),
  UNIQUE KEY uk_tpc_tenant_provider (tenant_id, provider)
) ENGINE=InnoDB;

-- ========================
-- Suppliers
-- ========================
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_supplier_tenant (tenant_id)
) ENGINE=InnoDB;

-- ========================
-- Purchase Orders
-- ========================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  po_number VARCHAR(50) NOT NULL,
  supplier_id BIGINT NOT NULL,
  status ENUM('DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',
  total_amount DECIMAL(14,2) DEFAULT 0,
  notes TEXT NULL,
  ordered_by BIGINT NULL,
  received_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  INDEX idx_po_tenant (tenant_id),
  INDEX idx_po_status (tenant_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ========================
-- Returns / Refunds
-- ========================
CREATE TABLE IF NOT EXISTS returns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  return_number VARCHAR(50) NOT NULL,
  sale_id BIGINT NOT NULL,
  customer_id BIGINT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED') DEFAULT 'PENDING',
  refund_amount DECIMAL(14,2) DEFAULT 0,
  refund_method ENUM('CASH', 'ORIGINAL_METHOD', 'STORE_CREDIT') DEFAULT 'CASH',
  processed_by BIGINT NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  INDEX idx_return_tenant (tenant_id),
  INDEX idx_return_status (tenant_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ========================
-- Discounts / Coupons
-- ========================
CREATE TABLE IF NOT EXISTS discounts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  type ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
  value DECIMAL(14,2) NOT NULL,
  min_order_amount DECIMAL(14,2) DEFAULT 0,
  max_uses INT NULL,
  used_count INT DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_discount_tenant (tenant_id),
  INDEX idx_discount_code (tenant_id, code)
) ENGINE=InnoDB;

-- ========================
-- Expenses
-- ========================
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  category ENUM('RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'TRANSPORT', 'MARKETING', 'MAINTENANCE', 'TAXES', 'OTHER') NOT NULL DEFAULT 'OTHER',
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method ENUM('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER') DEFAULT 'CASH',
  reference VARCHAR(255) NULL,
  recorded_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_expense_tenant (tenant_id),
  INDEX idx_expense_date (tenant_id, expense_date)
) ENGINE=InnoDB;

-- ========================
-- Cash Register Sessions
-- ========================
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
  status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_crs_tenant (tenant_id),
  INDEX idx_crs_status (tenant_id, status)
) ENGINE=InnoDB;

-- ========================
-- Store Settings (key-value)
-- ========================
CREATE TABLE IF NOT EXISTS store_settings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uk_setting (tenant_id, setting_key)
) ENGINE=InnoDB;

-- ========================
-- Customer Credits/Debts
-- ========================
CREATE TABLE IF NOT EXISTS customer_credits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  sale_id BIGINT NULL,
  type ENUM('CREDIT', 'PAYMENT') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description VARCHAR(500) NULL,
  recorded_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_cc_customer (tenant_id, customer_id)
) ENGINE=InnoDB;

-- ========================
-- Tax Configuration
-- ========================
CREATE TABLE IF NOT EXISTS tax_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tax_tenant (tenant_id)
) ENGINE=InnoDB;
