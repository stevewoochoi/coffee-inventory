-- V30: V6.3 Store table extension for store management
-- item_delivery_schedule already exists from V26

-- Store table extensions
ALTER TABLE store ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE store ADD COLUMN IF NOT EXISTS address VARCHAR(300);
ALTER TABLE store ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE store ADD COLUMN IF NOT EXISTS open_date DATE;
ALTER TABLE store ADD COLUMN IF NOT EXISTS memo TEXT;

-- Set existing stores to ACTIVE
UPDATE store SET status = 'ACTIVE' WHERE status IS NULL;
