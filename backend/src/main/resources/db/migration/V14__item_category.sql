-- V14: Item category table + item.category_id FK
CREATE TABLE item_category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_category_brand_name (brand_id, name)
);

-- Add category_id to item table
ALTER TABLE item ADD COLUMN category_id BIGINT NULL;

-- Migrate existing category string data to item_category table
INSERT INTO item_category (brand_id, name, display_order, is_active)
SELECT DISTINCT i.brand_id, i.category, 0, TRUE
FROM item i
WHERE i.category IS NOT NULL AND i.category != '';

-- Update item.category_id based on existing category string
UPDATE item i
INNER JOIN item_category ic ON i.brand_id = ic.brand_id AND i.category = ic.name
SET i.category_id = ic.id
WHERE i.category IS NOT NULL AND i.category != '';
