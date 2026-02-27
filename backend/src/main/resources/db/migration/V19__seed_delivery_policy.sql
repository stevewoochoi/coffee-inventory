-- =============================================
-- Seed delivery policy data for ordering system
-- =============================================

-- Default delivery policy for brand 1 (블루마운틴 커피)
INSERT INTO delivery_policy (id, brand_id, policy_name, delivery_days, cutoff_time, cutoff_lead_days_before, cutoff_lead_days_after, fulfillment_center, temperature_zone, is_active)
VALUES
(1, 1, '기본 배송정책 (월/수/금)', 'MON_WED_FRI', '09:00:00', 2, 3, '서울센터', 'AMBIENT', 1),
(2, 1, '냉장 배송정책 (화/목/토)', 'TUE_THU_SAT', '09:00:00', 2, 3, '서울센터', 'CHILLED', 1);

-- Map stores to delivery policies
INSERT INTO store_delivery_policy (id, store_id, delivery_policy_id, is_default)
VALUES
(1, 1, 1, 1),  -- 강남점 → 기본 배송정책
(2, 2, 1, 1);  -- 홍대점 → 기본 배송정책

-- Update items to be orderable with categories and additional fields
UPDATE item SET is_orderable = 1, temperature_zone = 'AMBIENT' WHERE id IN (1, 3, 4, 5);
UPDATE item SET is_orderable = 1, temperature_zone = 'CHILLED' WHERE id = 2;
UPDATE item SET lead_time_days = 3 WHERE id = 1;  -- 원두: 3일
UPDATE item SET lead_time_days = 1 WHERE id = 2;  -- 우유: 1일
UPDATE item SET lead_time_days = 5 WHERE id = 3;  -- 시럽: 5일
UPDATE item SET lead_time_days = 2 WHERE id IN (4, 5);  -- 소모품: 2일
UPDATE item SET max_order_qty = 50 WHERE id IN (1, 2, 3);
UPDATE item SET max_order_qty = 100 WHERE id IN (4, 5);
UPDATE item SET min_stock_qty = 3000 WHERE id = 1;  -- 원두: 3kg 이하 저재고
UPDATE item SET min_stock_qty = 5000 WHERE id = 2;  -- 우유: 5L 이하 저재고
UPDATE item SET min_stock_qty = 1500 WHERE id = 3;  -- 시럽: 1.5L 이하 저재고
UPDATE item SET min_stock_qty = 100 WHERE id IN (4, 5);  -- 컵: 100개 이하 저재고

-- Assign categories to items (item_category should exist from V14)
-- Check if categories exist, if not insert them
INSERT IGNORE INTO item_category (id, brand_id, name, display_order, is_active)
VALUES
(1, 1, '원두', 1, 1),
(2, 1, '유제품', 2, 1),
(3, 1, '시럽', 3, 1),
(4, 1, '소모품', 4, 1);

UPDATE item SET category_id = 1 WHERE id = 1;  -- 에스프레소 원두 → 원두
UPDATE item SET category_id = 2 WHERE id = 2;  -- 우유 → 유제품
UPDATE item SET category_id = 3 WHERE id = 3;  -- 바닐라 시럽 → 시럽
UPDATE item SET category_id = 4 WHERE id IN (4, 5);  -- 컵 → 소모품
