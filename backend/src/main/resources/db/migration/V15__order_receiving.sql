-- V15: Extend order_plan status + delivery.order_plan_id
ALTER TABLE order_plan MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DRAFT';

-- Add order_plan_id to delivery for linking
ALTER TABLE delivery ADD COLUMN order_plan_id BIGINT NULL;
CREATE INDEX idx_delivery_order_plan ON delivery(order_plan_id);
