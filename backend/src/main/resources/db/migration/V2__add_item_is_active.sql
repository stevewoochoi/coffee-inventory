-- Add is_active column to item table for soft delete support
ALTER TABLE item ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER loss_rate;
