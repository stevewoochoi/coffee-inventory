-- V46: Warehouse-as-Store + Internal Warehouse mapping
-- All changes are additive. Existing data/queries are unaffected.
-- Idempotent (IF NOT EXISTS pattern via INFORMATION_SCHEMA).

-- 1. store.store_type
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store' AND COLUMN_NAME='store_type');
SET @q = IF(@col=0,
    'ALTER TABLE store ADD COLUMN store_type VARCHAR(20) NOT NULL DEFAULT ''STORE'' COMMENT ''STORE | WAREHOUSE''',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. store.is_internal_warehouse
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store' AND COLUMN_NAME='is_internal_warehouse');
SET @q = IF(@col=0,
    'ALTER TABLE store ADD COLUMN is_internal_warehouse TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Brand-owned warehouse flag''',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 3. supplier.internal_warehouse_store_id
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='supplier' AND COLUMN_NAME='internal_warehouse_store_id');
SET @q = IF(@col=0,
    'ALTER TABLE supplier ADD COLUMN internal_warehouse_store_id BIGINT NULL COMMENT ''Internal warehouse store id; NULL = external supplier''',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 4. Indexes
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store' AND INDEX_NAME='idx_store_brand_type');
SET @q = IF(@idx=0,
    'CREATE INDEX idx_store_brand_type ON store(brand_id, store_type, status)',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='supplier' AND INDEX_NAME='idx_supplier_internal_warehouse');
SET @q = IF(@idx=0,
    'CREATE INDEX idx_supplier_internal_warehouse ON supplier(internal_warehouse_store_id)',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- 5. FK (skip silently if already exists)
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='supplier' AND CONSTRAINT_NAME='fk_supplier_internal_warehouse');
SET @q = IF(@fk=0,
    'ALTER TABLE supplier ADD CONSTRAINT fk_supplier_internal_warehouse FOREIGN KEY (internal_warehouse_store_id) REFERENCES store(id)',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
