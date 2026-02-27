-- V18: Soldout management
CREATE TABLE soldout_item (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id    BIGINT       NOT NULL,
    item_id     BIGINT       NOT NULL,
    reason      VARCHAR(100),
    registered_by BIGINT,
    registered_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_soldout_store FOREIGN KEY (store_id) REFERENCES store(id),
    CONSTRAINT fk_soldout_item FOREIGN KEY (item_id) REFERENCES item(id),
    INDEX idx_soldout_store_active (store_id, is_active)
);
