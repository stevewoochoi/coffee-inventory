-- =============================================
-- V9: Add pdf_url column to order_dispatch_log
-- =============================================

ALTER TABLE order_dispatch_log ADD COLUMN pdf_url VARCHAR(500) AFTER response_body;
