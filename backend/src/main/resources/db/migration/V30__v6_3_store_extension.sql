-- V30: V6.3 Store table extension for store management

-- Store table extensions
ALTER TABLE store ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE store ADD COLUMN address VARCHAR(300);
ALTER TABLE store ADD COLUMN phone VARCHAR(30);
ALTER TABLE store ADD COLUMN open_date DATE;
ALTER TABLE store ADD COLUMN memo TEXT;

-- Set existing stores to ACTIVE
UPDATE store SET status = 'ACTIVE' WHERE status IS NULL;
