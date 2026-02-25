-- =============================================
-- V4: 유통기한 관리 + FIFO 스키마 확장
-- =============================================

-- inventory_snapshot에 lot별 관리를 위한 exp_date 컬럼 추가
ALTER TABLE inventory_snapshot
    ADD COLUMN exp_date DATE AFTER item_id,
    ADD COLUMN lot_no VARCHAR(100) AFTER exp_date;

-- 기존 unique constraint 변경 (store_id + item_id + exp_date + lot_no)
ALTER TABLE inventory_snapshot
    DROP INDEX uq_store_item,
    ADD UNIQUE KEY uq_store_item_lot (store_id, item_id, exp_date, lot_no);

-- stock_ledger에 exp_date, lot_no 컬럼 추가
ALTER TABLE stock_ledger
    ADD COLUMN exp_date DATE AFTER qty_base_unit,
    ADD COLUMN lot_no VARCHAR(100) AFTER exp_date;

-- stock_ledger exp_date 인덱스 (FIFO 조회 최적화)
CREATE INDEX idx_stock_ledger_exp_date ON stock_ledger(store_id, item_id, exp_date);

-- 유통기한 알림 테이블
CREATE TABLE item_expiry_alert (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    lot_no VARCHAR(100),
    exp_date DATE NOT NULL,
    qty_base_unit DECIMAL(12,3) NOT NULL,
    alert_status ENUM('NORMAL','WARNING','CRITICAL','EXPIRED') DEFAULT 'NORMAL',
    notified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 알림 조회 성능 인덱스
CREATE INDEX idx_expiry_alert_store ON item_expiry_alert(store_id, alert_status);
CREATE INDEX idx_expiry_alert_exp_date ON item_expiry_alert(exp_date);
