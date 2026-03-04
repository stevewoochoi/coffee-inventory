-- V26: V6 Item Delivery Schedule + Item/Packaging extensions

-- A. item table extensions
ALTER TABLE item ADD COLUMN item_code VARCHAR(50);
ALTER TABLE item ADD COLUMN spec VARCHAR(200);
ALTER TABLE item ADD COLUMN description TEXT;
ALTER TABLE item ADD UNIQUE INDEX uq_brand_item_code (brand_id, item_code);

-- B. packaging table extension
ALTER TABLE packaging ADD COLUMN order_unit_name VARCHAR(20) DEFAULT 'BOX';

-- C. item_category extensions
ALTER TABLE item_category ADD COLUMN code VARCHAR(20);
ALTER TABLE item_category ADD COLUMN description TEXT;

-- D. item_delivery_schedule table
CREATE TABLE item_delivery_schedule (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT NOT NULL,
  brand_id BIGINT NOT NULL,
  mon TINYINT(1) DEFAULT 0,
  tue TINYINT(1) DEFAULT 0,
  wed TINYINT(1) DEFAULT 0,
  thu TINYINT(1) DEFAULT 0,
  fri TINYINT(1) DEFAULT 0,
  sat TINYINT(1) DEFAULT 0,
  sun TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES item(id),
  UNIQUE KEY uq_item_schedule (item_id, brand_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
