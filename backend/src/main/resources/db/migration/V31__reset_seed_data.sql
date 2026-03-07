-- =============================================
-- V31: Reset all data and seed fresh cafe items
-- =============================================

-- Disable FK checks for clean truncation
SET FOREIGN_KEY_CHECKS = 0;

-- Clear transactional data
TRUNCATE TABLE pos_sales;
TRUNCATE TABLE recipe_component;
TRUNCATE TABLE menu_option;
TRUNCATE TABLE menu;
TRUNCATE TABLE delivery_scan;
TRUNCATE TABLE delivery;
TRUNCATE TABLE waste;
TRUNCATE TABLE stock_ledger;
TRUNCATE TABLE inventory_snapshot;
TRUNCATE TABLE order_dispatch_log;
TRUNCATE TABLE order_line;
TRUNCATE TABLE order_plan;
TRUNCATE TABLE supplier_item;
TRUNCATE TABLE store_delivery_policy;

-- Clear master data
TRUNCATE TABLE packaging;
TRUNCATE TABLE item;
TRUNCATE TABLE item_category;
TRUNCATE TABLE supplier;
TRUNCATE TABLE store;

-- Clear user data (keep admin)
DELETE FROM users WHERE id > 1;

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- Company / Brand (keep existing)
-- =============================================
-- company id=1 '커피코리아', brand id=1 '블루마운틴 커피' already exist

-- =============================================
-- Stores (Japanese market)
-- =============================================
INSERT INTO store (id, brand_id, name, timezone, status, address) VALUES
(1, 1, '미나미아오야마점', 'Asia/Tokyo', 'ACTIVE', '東京都港区南青山3-8-40'),
(2, 1, '시부야GMO점', 'Asia/Tokyo', 'ACTIVE', '東京都渋谷区桜丘町26-1');

-- =============================================
-- Suppliers
-- =============================================
INSERT INTO supplier (id, brand_id, name, email, order_method) VALUES
(1, 1, '도쿄원두무역', 'beans@tokyotrade.jp', 'EMAIL'),
(2, 1, '일본유업', 'order@nihon-dairy.jp', 'PORTAL'),
(3, 1, '카페자재상사', 'supply@cafe-materials.jp', 'EMAIL');

-- =============================================
-- Categories
-- =============================================
INSERT INTO item_category (id, brand_id, name, display_order, is_active) VALUES
(1, 1, '원두', 1, 1),
(2, 1, '유제품', 2, 1),
(3, 1, '시럽/소스', 3, 1),
(4, 1, '컵/리드', 4, 1),
(5, 1, '기타소모품', 5, 1);

-- =============================================
-- Items (15 items)
-- =============================================
INSERT INTO item (id, brand_id, name, category, base_unit, loss_rate, is_active, price, vat_inclusive, supplier_id, category_id, lead_time_days, max_order_qty, temperature_zone, is_orderable, item_code) VALUES
-- 원두 (2)
( 1, 1, '발트클라스 1kg',     '원두',     'g',  0.0200, 1, 28000, 1, 1, 1, 3, 30, 'AMBIENT', 1, 'BEAN-001'),
( 2, 1, '다크루스티히 1kg',   '원두',     'g',  0.0200, 1, 32000, 1, 1, 1, 3, 30, 'AMBIENT', 1, 'BEAN-002'),
-- 유제품 (2)
( 3, 1, '우유 1L',            '유제품',   'ml', 0.0500, 1,  2800, 1, 2, 2, 1, 50, 'CHILLED', 1, 'MILK-001'),
( 4, 1, '오트밀크 1L',        '유제품',   'ml', 0.0300, 1,  4500, 1, 2, 2, 1, 30, 'CHILLED', 1, 'MILK-002'),
-- 시럽/소스 (2)
( 5, 1, '모닌바닐라시럽 500mL', '시럽/소스', 'ml', 0.0100, 1, 12000, 1, 3, 3, 5, 20, 'AMBIENT', 1, 'SYR-001'),
( 6, 1, '모닌카라멜시럽 500mL', '시럽/소스', 'ml', 0.0100, 1, 12000, 1, 3, 3, 5, 20, 'AMBIENT', 1, 'SYR-002'),
-- 컵/리드 (7)
( 7, 1, '22oz 92파이 아이스컵', '컵/리드', 'ea', 0.0000, 1,    55, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'CUP-001'),
( 8, 1, '16oz 핫컵',           '컵/리드', 'ea', 0.0000, 1,    48, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'CUP-002'),
( 9, 1, '14oz 92파이 아이스컵', '컵/리드', 'ea', 0.0000, 1,    50, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'CUP-003'),
(10, 1, '12oz 핫컵',           '컵/리드', 'ea', 0.0000, 1,    42, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'CUP-004'),
(11, 1, '아이스리드 92파이',   '컵/리드', 'ea', 0.0000, 1,    25, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'LID-001'),
(12, 1, '핫리드',              '컵/리드', 'ea', 0.0000, 1,    22, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'LID-002'),
(13, 1, '홀더',                '컵/리드', 'ea', 0.0000, 1,    18, 0, 3, 4, 2, 50, 'AMBIENT', 1, 'HOLD-001'),
-- 기타소모품 (2)
(14, 1, '빨대 (개별포장)',     '기타소모품', 'ea', 0.0000, 1,   8, 0, 3, 5, 2, 50, 'AMBIENT', 1, 'ETC-001'),
(15, 1, '냅킨',               '기타소모품', 'ea', 0.0000, 1,   5, 0, 3, 5, 2, 50, 'AMBIENT', 1, 'ETC-002');

-- =============================================
-- Packaging (BOX units)
-- =============================================
INSERT INTO packaging (id, item_id, pack_name, units_per_pack, pack_barcode, status, order_unit_name) VALUES
( 1,  1, '발트클라스 1kg × 15EA/BOX',        15.000, '4901234000001', 'ACTIVE', 'BOX'),
( 2,  2, '다크루스티히 1kg × 15EA/BOX',      15.000, '4901234000002', 'ACTIVE', 'BOX'),
( 3,  3, '우유 1L × 16EA/BOX',               16.000, '4901234000003', 'ACTIVE', 'BOX'),
( 4,  4, '오트밀크 1L × 12EA/BOX',           12.000, '4901234000004', 'ACTIVE', 'BOX'),
( 5,  5, '모닌바닐라시럽 500mL × 6EA/BOX',    6.000, '4901234000005', 'ACTIVE', 'BOX'),
( 6,  6, '모닌카라멜시럽 500mL × 6EA/BOX',    6.000, '4901234000006', 'ACTIVE', 'BOX'),
( 7,  7, '22oz 92파이 아이스컵 × 1000EA/BOX', 1000.000, '4901234000007', 'ACTIVE', 'BOX'),
( 8,  8, '16oz 핫컵 × 1000EA/BOX',           1000.000, '4901234000008', 'ACTIVE', 'BOX'),
( 9,  9, '14oz 92파이 아이스컵 × 1000EA/BOX', 1000.000, '4901234000009', 'ACTIVE', 'BOX'),
(10, 10, '12oz 핫컵 × 1000EA/BOX',           1000.000, '4901234000010', 'ACTIVE', 'BOX'),
(11, 11, '아이스리드 92파이 × 1000EA/BOX',    1000.000, '4901234000011', 'ACTIVE', 'BOX'),
(12, 12, '핫리드 × 1000EA/BOX',              1000.000, '4901234000012', 'ACTIVE', 'BOX'),
(13, 13, '홀더 × 1000EA/BOX',                1000.000, '4901234000013', 'ACTIVE', 'BOX'),
(14, 14, '빨대 × 1000EA/BOX',                1000.000, '4901234000014', 'ACTIVE', 'BOX'),
(15, 15, '냅킨 × 2000EA/BOX',                2000.000, '4901234000015', 'ACTIVE', 'BOX');

-- =============================================
-- Supplier-Item mapping
-- =============================================
INSERT INTO supplier_item (supplier_id, packaging_id, supplier_sku, lead_time_days, price) VALUES
-- 도쿄원두무역: 원두
(1,  1, 'TT-WALT-1KG',   3, 420000.00),   -- 발트클라스 BOX (28000×15)
(1,  2, 'TT-DARK-1KG',   3, 480000.00),   -- 다크루스티히 BOX (32000×15)
-- 일본유업: 유제품
(2,  3, 'ND-MILK-1L',    1,  44800.00),   -- 우유 BOX (2800×16)
(2,  4, 'ND-OAT-1L',     1,  54000.00),   -- 오트밀크 BOX (4500×12)
-- 카페자재상사: 시럽 + 소모품
(3,  5, 'CM-VAN-500',    5,  72000.00),   -- 바닐라시럽 BOX (12000×6)
(3,  6, 'CM-CAR-500',    5,  72000.00),   -- 카라멜시럽 BOX
(3,  7, 'CM-CUP22',      2,  55000.00),   -- 22oz 아이스컵 BOX
(3,  8, 'CM-CUP16H',     2,  48000.00),   -- 16oz 핫컵 BOX
(3,  9, 'CM-CUP14',      2,  50000.00),   -- 14oz 아이스컵 BOX
(3, 10, 'CM-CUP12H',     2,  42000.00),   -- 12oz 핫컵 BOX
(3, 11, 'CM-LID-ICE',    2,  25000.00),   -- 아이스리드 BOX
(3, 12, 'CM-LID-HOT',    2,  22000.00),   -- 핫리드 BOX
(3, 13, 'CM-HOLDER',     2,  18000.00),   -- 홀더 BOX
(3, 14, 'CM-STRAW',      2,   8000.00),   -- 빨대 BOX
(3, 15, 'CM-NAPKIN',     2,  10000.00);   -- 냅킨 BOX

-- =============================================
-- Min stock quantities
-- =============================================
UPDATE item SET min_stock_qty = 5000  WHERE id = 1;   -- 발트클라스 5kg
UPDATE item SET min_stock_qty = 5000  WHERE id = 2;   -- 다크루스티히 5kg
UPDATE item SET min_stock_qty = 8000  WHERE id = 3;   -- 우유 8L
UPDATE item SET min_stock_qty = 5000  WHERE id = 4;   -- 오트밀크 5L
UPDATE item SET min_stock_qty = 1000  WHERE id = 5;   -- 바닐라시럽 1L
UPDATE item SET min_stock_qty = 1000  WHERE id = 6;   -- 카라멜시럽 1L
UPDATE item SET min_stock_qty = 500   WHERE id IN (7, 8, 9, 10);  -- 컵 500개
UPDATE item SET min_stock_qty = 500   WHERE id IN (11, 12);       -- 리드 500개
UPDATE item SET min_stock_qty = 500   WHERE id = 13;              -- 홀더 500개
UPDATE item SET min_stock_qty = 500   WHERE id = 14;              -- 빨대 500개
UPDATE item SET min_stock_qty = 500   WHERE id = 15;              -- 냅킨 500개

-- =============================================
-- Initial inventory (미나미아오야마점)
-- =============================================
INSERT INTO inventory_snapshot (store_id, item_id, qty_base_unit) VALUES
(1,  1, 12000.000),  -- 발트클라스 12kg
(1,  2,  8000.000),  -- 다크루스티히 8kg
(1,  3, 15000.000),  -- 우유 15L
(1,  4,  6000.000),  -- 오트밀크 6L
(1,  5,  1500.000),  -- 바닐라시럽 1.5L
(1,  6,  1200.000),  -- 카라멜시럽 1.2L
(1,  7,  1500.000),  -- 22oz 아이스컵 1500개
(1,  8,  1200.000),  -- 16oz 핫컵 1200개
(1,  9,   800.000),  -- 14oz 아이스컵 800개
(1, 10,  1000.000),  -- 12oz 핫컵 1000개
(1, 11,  1500.000),  -- 아이스리드 1500개
(1, 12,  1200.000),  -- 핫리드 1200개
(1, 13,   600.000),  -- 홀더 600개
(1, 14,  1000.000),  -- 빨대 1000개
(1, 15,  2000.000);  -- 냅킨 2000개

-- =============================================
-- Initial inventory (시부야GMO점)
-- =============================================
INSERT INTO inventory_snapshot (store_id, item_id, qty_base_unit) VALUES
(2,  1, 10000.000),
(2,  2,  6000.000),
(2,  3, 12000.000),
(2,  4,  4000.000),
(2,  5,   800.000),   -- 저재고
(2,  6,  1000.000),
(2,  7,  1000.000),
(2,  8,   400.000),   -- 저재고
(2,  9,   600.000),
(2, 10,   800.000),
(2, 11,  1000.000),
(2, 12,   300.000),   -- 저재고
(2, 13,   500.000),
(2, 14,   800.000),
(2, 15,  1500.000);

-- =============================================
-- Delivery policies for new stores
-- =============================================
DELETE FROM delivery_policy WHERE brand_id = 1;
INSERT INTO delivery_policy (id, brand_id, policy_name, delivery_days, cutoff_time, cutoff_lead_days_before, cutoff_lead_days_after, fulfillment_center, temperature_zone, is_active) VALUES
(1, 1, '기본 배송정책 (월/수/금)', 'MON_WED_FRI', '09:00:00', 2, 3, '도쿄센터', 'AMBIENT', 1),
(2, 1, '냉장 배송정책 (화/목/토)', 'TUE_THU_SAT', '09:00:00', 2, 3, '도쿄센터', 'CHILLED', 1);

INSERT INTO store_delivery_policy (store_id, delivery_policy_id, is_default) VALUES
(1, 1, 1),
(2, 1, 1);

-- =============================================
-- Users: update admin and add store managers
-- =============================================
UPDATE users SET company_id = 1, brand_id = 1 WHERE id = 1;

INSERT INTO users (email, name, password_hash, role, company_id, brand_id, store_id, is_active, account_status) VALUES
('brand@coffee.com',    '브랜드관리자', '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'BRAND_ADMIN',   1, 1, NULL, 1, 'ACTIVE'),
('aoyama@coffee.com',   '아오야마점장', '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'STORE_MANAGER', 1, 1, 1,    1, 'ACTIVE'),
('shibuya@coffee.com',  '시부야점장',   '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'STORE_MANAGER', 1, 1, 2,    1, 'ACTIVE');

-- =============================================
-- Sample menus
-- =============================================
INSERT INTO menu (id, brand_id, name, pos_menu_id) VALUES
(1, 1, '아메리카노', 'AMER-001'),
(2, 1, '카페라떼', 'LATE-001'),
(3, 1, '바닐라라떼', 'VLAT-001'),
(4, 1, '아이스아메리카노', 'IAME-001'),
(5, 1, '아이스카페라떼', 'ILAT-001');

INSERT INTO recipe_component (menu_id, option_id, item_id, qty_base_unit) VALUES
(1, NULL, 1, 18.000),   -- 아메리카노: 발트클라스 18g
(1, NULL, 10, 1.000),   -- 아메리카노: 12oz 핫컵 1ea
(1, NULL, 12, 1.000),   -- 아메리카노: 핫리드 1ea
(2, NULL, 1, 18.000),   -- 카페라떼: 발트클라스 18g
(2, NULL, 3, 200.000),  -- 카페라떼: 우유 200ml
(2, NULL, 10, 1.000),   -- 카페라떼: 12oz 핫컵 1ea
(2, NULL, 12, 1.000),   -- 카페라떼: 핫리드 1ea
(3, NULL, 1, 18.000),   -- 바닐라라떼: 발트클라스 18g
(3, NULL, 3, 200.000),  -- 바닐라라떼: 우유 200ml
(3, NULL, 5, 15.000),   -- 바닐라라떼: 바닐라시럽 15ml
(3, NULL, 8, 1.000),    -- 바닐라라떼: 16oz 핫컵 1ea
(3, NULL, 12, 1.000),   -- 바닐라라떼: 핫리드 1ea
(4, NULL, 2, 18.000),   -- 아이스아메리카노: 다크루스티히 18g
(4, NULL, 7, 1.000),    -- 아이스아메리카노: 22oz 아이스컵 1ea
(4, NULL, 11, 1.000),   -- 아이스아메리카노: 아이스리드 1ea
(4, NULL, 14, 1.000),   -- 아이스아메리카노: 빨대 1ea
(5, NULL, 2, 18.000),   -- 아이스카페라떼: 다크루스티히 18g
(5, NULL, 3, 200.000),  -- 아이스카페라떼: 우유 200ml
(5, NULL, 7, 1.000),    -- 아이스카페라떼: 22oz 아이스컵 1ea
(5, NULL, 11, 1.000),   -- 아이스카페라떼: 아이스리드 1ea
(5, NULL, 14, 1.000);   -- 아이스카페라떼: 빨대 1ea
