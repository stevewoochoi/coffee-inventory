-- V27: V6 Cutoff, Roles expansion, Finance, Bulk upload

-- A. Expand users.role from ENUM to VARCHAR
ALTER TABLE users MODIFY COLUMN role VARCHAR(30) NOT NULL DEFAULT 'STORE_MANAGER';
ALTER TABLE users MODIFY COLUMN account_status VARCHAR(30) DEFAULT 'PENDING_APPROVAL';

-- B. order_shortage_log table
CREATE TABLE order_shortage_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  order_line_id BIGINT NOT NULL,
  original_qty INT NOT NULL,
  adjusted_qty INT NOT NULL,
  shortage_reason VARCHAR(200),
  adjusted_by BIGINT NOT NULL,
  adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notified_at DATETIME,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id),
  FOREIGN KEY (order_line_id) REFERENCES order_line(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- C. bulk_upload_batch table
CREATE TABLE bulk_upload_batch (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  upload_type VARCHAR(30) NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  file_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'PENDING',
  total_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  error_details JSON,
  uploaded_by BIGINT NOT NULL,
  confirmed_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- D. monthly_closing table
CREATE TABLE monthly_closing (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  closing_year INT NOT NULL,
  closing_month INT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  total_purchase_amount DECIMAL(15,2) DEFAULT 0,
  total_sales_amount DECIMAL(15,2) DEFAULT 0,
  total_inventory_value DECIMAL(15,2) DEFAULT 0,
  closed_by BIGINT,
  closed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brand_month (brand_id, closing_year, closing_month),
  FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- E. supplier_order_notification table
CREATE TABLE supplier_order_notification (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  notification_type VARCHAR(30) NOT NULL,
  message TEXT,
  notified_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
