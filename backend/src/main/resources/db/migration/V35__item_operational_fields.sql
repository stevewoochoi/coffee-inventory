-- V35: Item operational fields + Cycle Count tables (additive only)

-- 1. item table operational fields
ALTER TABLE item
  ADD COLUMN stock_unit VARCHAR(20) DEFAULT 'ea' COMMENT 'Stock unit (g/ml/ea/pack)',
  ADD COLUMN order_unit VARCHAR(20) DEFAULT 'ea' COMMENT 'Order unit (box/bag/pack/bottle/sleeve/roll/ea)',
  ADD COLUMN conversion_qty DECIMAL(12,3) DEFAULT 1.000 COMMENT '1 order_unit = N stock_unit',
  ADD COLUMN min_order_qty INT DEFAULT 1 COMMENT 'Minimum order qty (order_unit)',
  ADD COLUMN par_level DECIMAL(12,3) DEFAULT 0.000 COMMENT 'Target stock level (stock_unit)',
  ADD COLUMN count_cycle VARCHAR(20) DEFAULT 'WEEKLY' COMMENT 'DAILY/TWICE_WEEKLY/WEEKLY/MONTHLY',
  ADD COLUMN storage_zone VARCHAR(20) DEFAULT 'AMBIENT' COMMENT 'REFRIGERATED/FROZEN/AMBIENT/SUPPLIES',
  ADD COLUMN item_grade VARCHAR(5) DEFAULT 'B' COMMENT 'A=daily/B=2x week/C=weekly',
  ADD COLUMN substitute_item_id BIGINT NULL COMMENT 'Alternative item_id',
  ADD COLUMN lot_tracking VARCHAR(20) DEFAULT 'NONE' COMMENT 'FULL/EXP_ONLY/NONE',
  ADD COLUMN daily_usage_avg DECIMAL(12,3) DEFAULT 0.000 COMMENT '7-day avg daily consumption',
  ADD COLUMN is_pos_tracked BOOLEAN DEFAULT FALSE COMMENT 'POS auto-deduction target';

-- 2. Indexes
CREATE INDEX idx_item_item_grade ON item(item_grade);
CREATE INDEX idx_item_storage_zone ON item(storage_zone);
CREATE INDEX idx_item_count_cycle ON item(count_cycle);

-- 3. cycle_count_session table
CREATE TABLE IF NOT EXISTS cycle_count_session (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id        BIGINT NOT NULL,
  grade_filter    VARCHAR(5)  NULL COMMENT 'A/B/C/ALL',
  zone_filter     VARCHAR(20) NULL COMMENT 'REFRIGERATED/FROZEN/AMBIENT/SUPPLIES/ALL',
  status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' COMMENT 'IN_PROGRESS/COMPLETED/CANCELLED',
  counted_by      BIGINT NULL COMMENT 'users.id',
  item_count      INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME NULL,
  note            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccs_store FOREIGN KEY (store_id) REFERENCES store(id)
);

-- 4. cycle_count_line table
CREATE TABLE IF NOT EXISTS cycle_count_line (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id      BIGINT NOT NULL,
  item_id         BIGINT NOT NULL,
  system_qty      DECIMAL(12,3) NULL,
  counted_qty     DECIMAL(12,3) NULL,
  variance_qty    DECIMAL(12,3) NULL,
  stock_unit      VARCHAR(20)   NULL,
  storage_zone    VARCHAR(20)   NULL,
  item_grade      VARCHAR(5)    NULL,
  is_adjusted     BOOLEAN DEFAULT FALSE,
  adjusted_at     DATETIME NULL,
  note            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccl_session FOREIGN KEY (session_id) REFERENCES cycle_count_session(id),
  CONSTRAINT fk_ccl_item    FOREIGN KEY (item_id)    REFERENCES item(id)
);

CREATE INDEX idx_ccs_store_status ON cycle_count_session(store_id, status);
CREATE INDEX idx_ccl_session ON cycle_count_line(session_id);
CREATE INDEX idx_ccl_item ON cycle_count_line(item_id);
