-- V44: Add currency column to item table
-- Allows admin to register items in JPY (¥), KRW (₩), or USD ($)
-- Default JPY for backward compatibility (Japanese market)

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='item' AND COLUMN_NAME='currency');
SET @q = IF(@col=0,
    'ALTER TABLE item ADD COLUMN currency VARCHAR(8) NOT NULL DEFAULT ''JPY''',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
