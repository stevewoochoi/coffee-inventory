-- =============================================
-- Coffee Inventory System - Initial Schema
-- =============================================

-- ----- Org -----

CREATE TABLE company (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE brand (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Users / Auth -----

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN','BRAND_ADMIN','STORE_MANAGER') NOT NULL,
    company_id BIGINT,
    brand_id BIGINT,
    store_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Master -----

CREATE TABLE item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    base_unit VARCHAR(20) NOT NULL,
    loss_rate DECIMAL(5,4) DEFAULT 0.0000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE packaging (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT NOT NULL,
    pack_name VARCHAR(100) NOT NULL,
    units_per_pack DECIMAL(10,3) NOT NULL,
    pack_barcode VARCHAR(100),
    status ENUM('ACTIVE','DEPRECATED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE supplier (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    order_method ENUM('EMAIL','PORTAL','EDI') DEFAULT 'EMAIL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE supplier_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    packaging_id BIGINT NOT NULL,
    supplier_sku VARCHAR(100),
    lead_time_days INT DEFAULT 1,
    price DECIMAL(12,2),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    FOREIGN KEY (packaging_id) REFERENCES packaging(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Stock -----

CREATE TABLE stock_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    qty_base_unit DECIMAL(12,3) NOT NULL,
    type ENUM('RECEIVE','SELL','WASTE','DAMAGE_RECEIVE','ADJUST') NOT NULL,
    ref_type VARCHAR(50),
    ref_id BIGINT,
    memo TEXT,
    created_by BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_snapshot (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    qty_base_unit DECIMAL(12,3) NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_store_item (store_id, item_id),
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Receiving -----

CREATE TABLE delivery (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    expected_at DATE,
    status ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_scan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    packaging_id BIGINT NOT NULL,
    lot_no VARCHAR(100),
    exp_date DATE,
    pack_count_scanned INT NOT NULL DEFAULT 1,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES delivery(id),
    FOREIGN KEY (packaging_id) REFERENCES packaging(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Waste / Damage -----

CREATE TABLE waste (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    qty_base_unit DECIMAL(10,3) NOT NULL,
    reason VARCHAR(200),
    waste_type ENUM('OPERATION','DAMAGE_RECEIVE') DEFAULT 'OPERATION',
    created_by BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Recipe & POS -----

CREATE TABLE menu (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    pos_menu_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE menu_option (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (menu_id) REFERENCES menu(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recipe_component (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT,
    option_id BIGINT,
    item_id BIGINT NOT NULL,
    qty_base_unit DECIMAL(10,3) NOT NULL,
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_sales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    business_date DATE NOT NULL,
    menu_id BIGINT NOT NULL,
    option_json JSON,
    qty INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (menu_id) REFERENCES menu(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Ordering -----

CREATE TABLE order_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    status ENUM('DRAFT','CONFIRMED','DISPATCHED','CANCELLED') DEFAULT 'DRAFT',
    recommended_by_ai BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_plan_id BIGINT NOT NULL,
    packaging_id BIGINT NOT NULL,
    pack_qty INT NOT NULL,
    FOREIGN KEY (order_plan_id) REFERENCES order_plan(id),
    FOREIGN KEY (packaging_id) REFERENCES packaging(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_dispatch_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_plan_id BIGINT NOT NULL,
    method ENUM('EMAIL','PORTAL','EDI') NOT NULL,
    status ENUM('SUCCESS','FAILED') NOT NULL,
    response_body TEXT,
    dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_plan_id) REFERENCES order_plan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- Indexes for performance -----

CREATE INDEX idx_stock_ledger_store_item ON stock_ledger(store_id, item_id);
CREATE INDEX idx_stock_ledger_created_at ON stock_ledger(created_at);
CREATE INDEX idx_delivery_store_status ON delivery(store_id, status);
CREATE INDEX idx_pos_sales_store_date ON pos_sales(store_id, business_date);
CREATE INDEX idx_order_plan_store_status ON order_plan(store_id, status);
CREATE INDEX idx_item_brand ON item(brand_id);
CREATE INDEX idx_users_email ON users(email);
