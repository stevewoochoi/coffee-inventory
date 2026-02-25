-- =============================================
-- Seed data for testing
-- =============================================

-- Company
INSERT IGNORE INTO company (id, name) VALUES (1, '커피코리아');

-- Brand
INSERT IGNORE INTO brand (id, company_id, name) VALUES (1, 1, '블루마운틴 커피');

-- Stores
INSERT IGNORE INTO store (id, brand_id, name) VALUES (1, 1, '강남점');
INSERT IGNORE INTO store (id, brand_id, name) VALUES (2, 1, '홍대점');

-- Users (password: admin123)
INSERT IGNORE INTO users (id, email, password_hash, role, company_id, brand_id, store_id) VALUES
(1, 'admin@coffee.com', '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'SUPER_ADMIN', 1, NULL, NULL),
(2, 'brand@coffee.com', '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'BRAND_ADMIN', 1, 1, NULL),
(3, 'store@coffee.com', '$2b$12$YQRdLSb0wHe/2qMIoglEL.nIWRNWKLp67Yg3PeSKB2yhIPfb29IgO', 'STORE_MANAGER', 1, 1, 1);

-- Supplier
INSERT IGNORE INTO supplier (id, brand_id, name, email) VALUES (1, 1, '원두무역', 'supplier@test.com');

-- Items (부재료)
INSERT IGNORE INTO item (id, brand_id, name, category, base_unit, loss_rate) VALUES
(1, 1, '에스프레소 원두', '원두', 'g', 0.0200),
(2, 1, '우유', '유제품', 'ml', 0.0500),
(3, 1, '바닐라 시럽', '시럽', 'ml', 0.0100),
(4, 1, '컵 (12oz)', '소모품', 'ea', 0.0000),
(5, 1, '컵 (16oz)', '소모품', 'ea', 0.0000);

-- Packaging (포장단위)
INSERT IGNORE INTO packaging (id, item_id, pack_name, units_per_pack, pack_barcode) VALUES
(1, 1, '원두 1kg', 1000.000, '8801234567890'),
(2, 2, '우유 1L', 1000.000, '8801234567891'),
(3, 3, '바닐라시럽 750ml', 750.000, '8801234567892'),
(4, 4, '12oz컵 50개입', 50.000, '8801234567893'),
(5, 5, '16oz컵 50개입', 50.000, '8801234567894');

-- Supplier-Item mapping
INSERT IGNORE INTO supplier_item (id, supplier_id, packaging_id, supplier_sku, lead_time_days, price) VALUES
(1, 1, 1, 'BEAN-ESP-1KG', 3, 25000.00),
(2, 1, 2, 'MILK-1L', 1, 2500.00),
(3, 1, 3, 'SYR-VAN-750', 5, 8000.00);

-- Initial inventory snapshot (강남점)
INSERT IGNORE INTO inventory_snapshot (store_id, item_id, qty_base_unit) VALUES
(1, 1, 5000.000),
(1, 2, 10000.000),
(1, 3, 3000.000),
(1, 4, 200.000),
(1, 5, 150.000);

-- Menu
INSERT IGNORE INTO menu (id, brand_id, name, pos_menu_id) VALUES
(1, 1, '아메리카노', 'AMER-001'),
(2, 1, '카페라떼', 'LATE-001'),
(3, 1, '바닐라라떼', 'VLAT-001');

-- Recipe components
INSERT IGNORE INTO recipe_component (menu_id, option_id, item_id, qty_base_unit) VALUES
(1, NULL, 1, 18.000),
(1, NULL, 4, 1.000),
(2, NULL, 1, 18.000),
(2, NULL, 2, 200.000),
(2, NULL, 4, 1.000),
(3, NULL, 1, 18.000),
(3, NULL, 2, 200.000),
(3, NULL, 3, 30.000),
(3, NULL, 5, 1.000);
