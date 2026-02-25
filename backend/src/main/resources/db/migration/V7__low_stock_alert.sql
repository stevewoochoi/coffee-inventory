-- =============================================
-- V7: 저재고 알림 테이블
-- =============================================

CREATE TABLE low_stock_alert (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    current_qty DECIMAL(12,3) NOT NULL,
    min_stock_qty DECIMAL(12,3) NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_low_stock_alert_store ON low_stock_alert(store_id);
