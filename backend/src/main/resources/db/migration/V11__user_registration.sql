-- =============================================
-- V11: User Registration & Multi-Store Mapping
-- =============================================

-- Add name column to users
ALTER TABLE users ADD COLUMN name VARCHAR(100) AFTER email;

-- Add registration/approval columns to users
ALTER TABLE users ADD COLUMN account_status ENUM('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED') DEFAULT 'PENDING_APPROVAL' AFTER is_active;
ALTER TABLE users ADD COLUMN approved_by BIGINT AFTER account_status;
ALTER TABLE users ADD COLUMN approved_at DATETIME AFTER approved_by;
ALTER TABLE users ADD COLUMN rejected_reason TEXT AFTER approved_at;
ALTER TABLE users ADD COLUMN registered_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER rejected_reason;

-- Set existing active users to ACTIVE status
UPDATE users SET account_status = 'ACTIVE' WHERE is_active = TRUE;
UPDATE users SET account_status = 'SUSPENDED' WHERE is_active = FALSE;

-- Create user_store mapping table (many-to-many: user <-> store)
CREATE TABLE user_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES store(id),
    UNIQUE KEY uk_user_store (user_id, store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing store_id assignments to user_store table
INSERT INTO user_store (user_id, store_id, is_primary)
SELECT id, store_id, 1 FROM users WHERE store_id IS NOT NULL AND role = 'STORE_MANAGER';

-- Index for performance
CREATE INDEX idx_user_store_user ON user_store(user_id);
CREATE INDEX idx_user_store_store ON user_store(store_id);
