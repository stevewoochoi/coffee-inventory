-- V41: Security & Data Integrity Fixes
-- 1. Optimistic locking for inventory_snapshot
-- 2. Order line audit trail (soft delete + version tracking)

-- Add version column for optimistic locking on inventory_snapshot
ALTER TABLE inventory_snapshot ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Add audit trail columns to order_line
ALTER TABLE order_line ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE order_line ADD COLUMN modification_version INT NOT NULL DEFAULT 0;

-- Index for active order lines lookup
CREATE INDEX idx_order_line_plan_active ON order_line (order_plan_id, is_active);

-- Index for delivery by order_plan_id (partial receive tracking)
CREATE INDEX idx_delivery_order_plan ON delivery (order_plan_id);
