-- V16: Add timestamp columns to order_plan for tracking
ALTER TABLE order_plan ADD COLUMN confirmed_at DATETIME NULL;
ALTER TABLE order_plan ADD COLUMN dispatched_at DATETIME NULL;
ALTER TABLE order_plan ADD COLUMN received_at DATETIME NULL;
