CREATE TABLE daily_physical_count (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id    BIGINT NOT NULL,
  item_id     BIGINT NOT NULL,
  count_date  DATE   NOT NULL,
  qty         DECIMAL(12,3) NOT NULL,
  memo        VARCHAR(200) DEFAULT NULL,
  created_by  BIGINT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_daily_store_item_date (store_id, item_id, count_date),
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (item_id)  REFERENCES item(id)
);
