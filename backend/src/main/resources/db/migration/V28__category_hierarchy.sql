-- V28: Add hierarchy support to item_category
-- Columns may already exist from a partial migration; use stored procedures to make idempotent.

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
CREATE PROCEDURE add_column_if_not_exists()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'item_category' AND column_name = 'parent_id') THEN
        ALTER TABLE item_category ADD COLUMN parent_id BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'item_category' AND column_name = 'level') THEN
        ALTER TABLE item_category ADD COLUMN level TINYINT DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'item_category' AND column_name = 'code') THEN
        ALTER TABLE item_category ADD COLUMN code VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'item_category' AND column_name = 'description') THEN
        ALTER TABLE item_category ADD COLUMN description TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'item_category' AND column_name = 'icon') THEN
        ALTER TABLE item_category ADD COLUMN icon VARCHAR(50) NULL;
    END IF;

    -- Drop unique constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'item_category' AND index_name = 'uq_category_brand_name') THEN
        ALTER TABLE item_category DROP INDEX uq_category_brand_name;
    END IF;
END;

CALL add_column_if_not_exists();
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Set all existing categories as level 1 (top-level)
UPDATE item_category SET level = 1 WHERE level IS NULL;
