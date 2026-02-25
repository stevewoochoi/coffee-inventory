-- =============================================
-- V10: Push subscription table for Web Push
-- =============================================

CREATE TABLE push_subscription (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    endpoint    VARCHAR(500) NOT NULL,
    p256dh      VARCHAR(500) NOT NULL,
    auth        VARCHAR(200) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_push_sub_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_push_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
