-- =============================================
-- V6: 안전재고(최소재고) 설정
-- =============================================

ALTER TABLE item
    ADD COLUMN min_stock_qty DECIMAL(12,3) AFTER loss_rate;
