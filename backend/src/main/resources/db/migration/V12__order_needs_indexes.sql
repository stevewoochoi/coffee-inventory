-- V12: Add indexes for order needs query optimization
CREATE INDEX IF NOT EXISTS idx_order_line_order_plan_id ON order_line(order_plan_id);
CREATE INDEX IF NOT EXISTS idx_order_plan_store_status ON order_plan(store_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshot_store_item ON inventory_snapshot(store_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_store_type_created ON stock_ledger(store_id, type, created_at);
