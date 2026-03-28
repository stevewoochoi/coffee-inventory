-- V37: Link daily physical count to inventory system
ALTER TABLE daily_physical_count
  ADD COLUMN system_qty DECIMAL(12,3) NULL COMMENT 'System inventory qty at count time',
  ADD COLUMN variance_qty DECIMAL(12,3) NULL COMMENT 'Variance: counted - system',
  ADD COLUMN is_applied BOOLEAN DEFAULT FALSE COMMENT 'Whether variance was applied to inventory',
  ADD COLUMN applied_at DATETIME NULL COMMENT 'When adjustment was applied';
