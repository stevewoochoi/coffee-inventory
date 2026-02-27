-- V17__ordering_system.sql
-- =============================================
-- Phase 17-24: Ordering System Enhancement
-- =============================================

-- A. Delivery Policy
CREATE TABLE delivery_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    policy_name VARCHAR(100) NOT NULL,
    delivery_days VARCHAR(20) NOT NULL DEFAULT 'MON_WED_FRI',
    cutoff_time TIME NOT NULL DEFAULT '09:00:00',
    cutoff_lead_days_before INT NOT NULL DEFAULT 2,
    cutoff_lead_days_after INT NOT NULL DEFAULT 3,
    fulfillment_center VARCHAR(100),
    temperature_zone VARCHAR(20) DEFAULT 'AMBIENT',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE store_delivery_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    delivery_policy_id BIGINT NOT NULL,
    is_default TINYINT(1) DEFAULT 1,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (delivery_policy_id) REFERENCES delivery_policy(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_holiday (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    holiday_date DATE NOT NULL,
    description VARCHAR(200),
    UNIQUE KEY uq_brand_holiday (brand_id, holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- B. item_category extensions (parent_id, level, icon)
ALTER TABLE item_category ADD COLUMN parent_id BIGINT NULL;
ALTER TABLE item_category ADD COLUMN level TINYINT NOT NULL DEFAULT 1;
ALTER TABLE item_category ADD COLUMN icon VARCHAR(50) NULL;

-- C. item extensions
ALTER TABLE item ADD COLUMN lead_time_days INT DEFAULT 2;
ALTER TABLE item ADD COLUMN max_order_qty INT NULL;
ALTER TABLE item ADD COLUMN temperature_zone VARCHAR(20) DEFAULT 'AMBIENT';
ALTER TABLE item ADD COLUMN is_orderable TINYINT(1) DEFAULT 1;

-- D. order_cart extensions
ALTER TABLE order_cart ADD COLUMN delivery_date DATE NULL;
ALTER TABLE order_cart ADD COLUMN delivery_policy_id BIGINT NULL;
ALTER TABLE order_cart ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE order_cart ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- D2. order_cart_item extensions
ALTER TABLE order_cart_item ADD COLUMN item_id BIGINT NULL;
ALTER TABLE order_cart_item ADD COLUMN unit_price DECIMAL(12,2) NULL;
ALTER TABLE order_cart_item ADD COLUMN recommended_qty INT NULL;
ALTER TABLE order_cart_item ADD COLUMN recommended_by_ai TINYINT(1) DEFAULT 0;
ALTER TABLE order_cart_item ADD COLUMN added_by BIGINT NULL;

-- E. order_plan extensions
ALTER TABLE order_plan ADD COLUMN delivery_date DATE NULL;
ALTER TABLE order_plan ADD COLUMN cutoff_at DATETIME NULL;
ALTER TABLE order_plan ADD COLUMN auto_confirmed_at DATETIME NULL;
ALTER TABLE order_plan ADD COLUMN fulfillment_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE order_plan ADD COLUMN delivery_policy_id BIGINT NULL;
ALTER TABLE order_plan ADD COLUMN total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE order_plan ADD COLUMN vat_amount DECIMAL(12,2) DEFAULT 0;

-- F. delivery extensions
ALTER TABLE delivery ADD COLUMN ref_type VARCHAR(20) NULL;
ALTER TABLE delivery ADD COLUMN ref_id BIGINT NULL;

-- G. Claim tables
CREATE TABLE claim (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    order_plan_id BIGINT NULL,
    delivery_id BIGINT NULL,
    claim_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    description TEXT,
    requested_action VARCHAR(30),
    created_by BIGINT,
    resolved_by BIGINT,
    resolved_at DATETIME,
    resolution_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (order_plan_id) REFERENCES order_plan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE claim_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    packaging_id BIGINT NULL,
    claimed_qty INT NOT NULL,
    accepted_qty INT DEFAULT 0,
    reason TEXT,
    FOREIGN KEY (claim_id) REFERENCES claim(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE claim_image (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claim(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- H. Inventory Audit
CREATE TABLE inventory_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    audit_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    created_by BIGINT,
    completed_by BIGINT,
    completed_at DATETIME,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_audit_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    audit_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    system_qty DECIMAL(10,3) NOT NULL,
    actual_qty DECIMAL(10,3),
    difference DECIMAL(10,3),
    note TEXT,
    FOREIGN KEY (audit_id) REFERENCES inventory_audit(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- I. Indexes
CREATE INDEX idx_delivery_policy_brand ON delivery_policy(brand_id);
CREATE INDEX idx_store_delivery_policy ON store_delivery_policy(store_id);
CREATE INDEX idx_claim_store ON claim(store_id, status);
CREATE INDEX idx_claim_order ON claim(order_plan_id);
CREATE INDEX idx_inventory_audit_store ON inventory_audit(store_id, status);
CREATE INDEX idx_order_plan_delivery_date ON order_plan(delivery_date);
CREATE INDEX idx_order_plan_fulfillment ON order_plan(fulfillment_status);
CREATE INDEX idx_delivery_ref ON delivery(ref_type, ref_id);
