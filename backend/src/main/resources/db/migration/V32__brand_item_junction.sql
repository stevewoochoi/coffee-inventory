-- =============================================
-- V32: Brand-Item junction table for master item architecture
-- Master items are brand-agnostic, brand_item assigns items to brands
-- with brand-specific pricing and settings.
-- =============================================

-- 1. Create brand_item junction table
CREATE TABLE brand_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    price DECIMAL(12,2),
    vat_inclusive BOOLEAN DEFAULT TRUE,
    supplier_id BIGINT,
    min_stock_qty DECIMAL(12,3),
    is_orderable BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_brand_item (brand_id, item_id),
    FOREIGN KEY (brand_id) REFERENCES brand(id),
    FOREIGN KEY (item_id) REFERENCES item(id),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_brand_item_brand ON brand_item(brand_id);
CREATE INDEX idx_brand_item_item ON brand_item(item_id);

-- 2. Migrate existing item data into brand_item
INSERT INTO brand_item (brand_id, item_id, price, vat_inclusive, supplier_id, min_stock_qty, is_orderable, is_active)
SELECT brand_id, id, price, COALESCE(vat_inclusive, 1), supplier_id, min_stock_qty,
       COALESCE(is_orderable, 1), COALESCE(is_active, 1)
FROM item
WHERE is_active = 1;

-- 3. Make item.brand_id nullable (items become master/global items)
ALTER TABLE item MODIFY COLUMN brand_id BIGINT NULL;
