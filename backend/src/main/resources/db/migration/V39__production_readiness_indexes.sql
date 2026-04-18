-- ============================================================
-- V39: Production Readiness - Missing Indexes
-- 운영 환경 쿼리 성능 최적화를 위한 인덱스 추가
-- ============================================================

-- ============================================================
-- 1. 외래키 조인용 인덱스 (MySQL InnoDB FK에 자동생성되지만 명시적 보장)
-- ============================================================

-- delivery: supplier별 조회 빈번
CREATE INDEX idx_delivery_supplier ON delivery (supplier_id);
CREATE INDEX idx_delivery_expected_at ON delivery (expected_at);

-- order_plan: supplier별, status별 조회 빈번
CREATE INDEX idx_order_plan_supplier ON order_plan (supplier_id);
CREATE INDEX idx_order_plan_status ON order_plan (status);

-- claim: delivery별 조회
CREATE INDEX idx_claim_delivery ON claim (delivery_id);
CREATE INDEX idx_claim_created_at ON claim (created_at);
CREATE INDEX idx_claim_status ON claim (status);

-- waste: store/item별 조회
CREATE INDEX idx_waste_store_item ON waste (store_id, item_id);
CREATE INDEX idx_waste_created_at ON waste (created_at);

-- ============================================================
-- 2. 자주 필터링되는 컬럼 인덱스
-- ============================================================

-- item: category_id로 필터링 빈번
CREATE INDEX idx_item_category_id ON item (category_id);
-- item: supplier_id로 조회
CREATE INDEX idx_item_supplier_id ON item (supplier_id);
-- item: is_active 필터 (대부분 쿼리에서 사용)
CREATE INDEX idx_item_is_active ON item (is_active);

-- brand_item: is_active, is_orderable 필터링
CREATE INDEX idx_brand_item_is_active ON brand_item (is_active);
CREATE INDEX idx_brand_item_supplier ON brand_item (supplier_id);

-- order_cart: store+status 복합 조회
CREATE INDEX idx_order_cart_store_status ON order_cart (store_id, status);

-- pos_sales: business_date 범위 조회 (매출 분석)
CREATE INDEX idx_pos_sales_menu ON pos_sales (menu_id);

-- daily_physical_count: store+date 조회
CREATE INDEX idx_daily_count_store_date ON daily_physical_count (store_id, count_date);

-- delivery_scan: delivery별 조회
CREATE INDEX idx_delivery_scan_delivery ON delivery_scan (delivery_id);

-- supplier_item: supplier별 조회
CREATE INDEX idx_supplier_item_supplier ON supplier_item (supplier_id);
CREATE INDEX idx_supplier_item_packaging ON supplier_item (packaging_id);

-- packaging: item별 조회
CREATE INDEX idx_packaging_item ON packaging (item_id);
CREATE INDEX idx_packaging_status ON packaging (status);

-- menu: brand별 조회
CREATE INDEX idx_menu_brand ON menu (brand_id);
CREATE INDEX idx_menu_is_active ON menu (is_active);

-- users: role, is_active 필터
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_company ON users (company_id);
CREATE INDEX idx_users_brand ON users (brand_id);

-- order_line: order_plan별 조회
CREATE INDEX idx_order_line_plan ON order_line (order_plan_id);

-- order_cart_item: cart별 조회
CREATE INDEX idx_cart_item_cart ON order_cart_item (cart_id);

-- recipe_component: menu별, item별 조회
CREATE INDEX idx_recipe_menu ON recipe_component (menu_id);
CREATE INDEX idx_recipe_item ON recipe_component (item_id);

-- claim_line: claim별 조회
CREATE INDEX idx_claim_line_claim ON claim_line (claim_id);

-- claim_image: claim별 조회
CREATE INDEX idx_claim_image_claim ON claim_image (claim_id);
