-- V28: Add hierarchy support to item_category (parent_id, level, icon, code, description)

ALTER TABLE item_category ADD COLUMN parent_id BIGINT NULL;
ALTER TABLE item_category ADD COLUMN level TINYINT DEFAULT 1;
ALTER TABLE item_category ADD COLUMN code VARCHAR(20) NULL;
ALTER TABLE item_category ADD COLUMN description TEXT NULL;
ALTER TABLE item_category ADD COLUMN icon VARCHAR(50) NULL;

-- Drop existing unique constraint (same name allowed under different parents)
ALTER TABLE item_category DROP INDEX uq_category_brand_name;

-- Set all existing categories as level 1 (top-level)
UPDATE item_category SET level = 1 WHERE level IS NULL;
