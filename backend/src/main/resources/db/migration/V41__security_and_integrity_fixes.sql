-- V41: Security & Data Integrity Fixes
-- 1. Optimistic locking for inventory_snapshot
-- 2. Order line audit trail (soft delete + version tracking)

-- Add version column for optimistic locking on inventory_snapshot (skip if exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_snapshot' AND COLUMN_NAME = 'version');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE inventory_snapshot ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add audit trail columns to order_line (skip if exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_line' AND COLUMN_NAME = 'is_active');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE order_line ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_line' AND COLUMN_NAME = 'modification_version');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE order_line ADD COLUMN modification_version INT NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for active order lines lookup (skip if exists)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_line' AND INDEX_NAME = 'idx_order_line_plan_active');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_order_line_plan_active ON order_line (order_plan_id, is_active)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for delivery by order_plan_id (skip if exists)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery' AND INDEX_NAME = 'idx_delivery_order_plan');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_delivery_order_plan ON delivery (order_plan_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
