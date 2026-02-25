-- =============================================
-- V5: 실사(Physical Count) 스키마
-- =============================================

CREATE TABLE physical_count (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    count_date DATE NOT NULL,
    status ENUM('IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'IN_PROGRESS',
    counted_by BIGINT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES store(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE physical_count_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    count_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    system_qty DECIMAL(12,3) NOT NULL,
    actual_qty DECIMAL(12,3),
    gap_qty DECIMAL(12,3),
    note TEXT,
    FOREIGN KEY (count_id) REFERENCES physical_count(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_physical_count_store ON physical_count(store_id, status);
CREATE INDEX idx_physical_count_line_count ON physical_count_line(count_id);
