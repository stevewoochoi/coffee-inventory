-- ============================================================
-- V40: Production Readiness - Constraints & Data Integrity
-- 데이터 무결성 강화: UNIQUE, NOT NULL, CHECK 제약조건
-- ============================================================

-- ============================================================
-- 1. 누락된 UNIQUE 제약조건
-- ============================================================

-- soldout_item: 같은 매장+아이템 중복 품절 등록 방지
ALTER TABLE soldout_item
    ADD UNIQUE INDEX uq_soldout_store_item_active (store_id, item_id, is_active);

-- supplier_item: 동일 공급사+패키징 중복 방지
ALTER TABLE supplier_item
    ADD UNIQUE INDEX uq_supplier_packaging (supplier_id, packaging_id);

-- store_delivery_policy: 동일 매장+정책 중복 방지
ALTER TABLE store_delivery_policy
    ADD UNIQUE INDEX uq_store_policy (store_id, delivery_policy_id);

-- ============================================================
-- 2. 핵심 NOT NULL 제약조건 (데이터 무결성)
-- ============================================================

-- stock_ledger.created_by, waste.created_by:
-- POS 자동 차감 등 시스템 호출 시 createdBy가 없을 수 있어 nullable 유지

-- supplier.email: 발주 통신용 이메일 필수
UPDATE supplier SET email = '' WHERE email IS NULL;
ALTER TABLE supplier MODIFY COLUMN email VARCHAR(200) NOT NULL;

-- ============================================================
-- 3. CHECK 제약조건 (잘못된 데이터 유입 방지)
-- ============================================================

-- 재고 수량은 음수 불가
ALTER TABLE inventory_snapshot
    ADD CONSTRAINT chk_snapshot_qty CHECK (qty_base_unit >= 0);

-- 패키징 단위수량은 양수
ALTER TABLE packaging
    ADD CONSTRAINT chk_pack_units CHECK (units_per_pack > 0);

-- 가격은 0 이상
ALTER TABLE supplier_item
    ADD CONSTRAINT chk_supplier_item_price CHECK (price IS NULL OR price >= 0);

ALTER TABLE item
    ADD CONSTRAINT chk_item_price CHECK (price IS NULL OR price >= 0);

ALTER TABLE brand_item
    ADD CONSTRAINT chk_brand_item_price CHECK (price IS NULL OR price >= 0);

-- 리드타임은 0 이상
ALTER TABLE supplier_item
    ADD CONSTRAINT chk_lead_time CHECK (lead_time_days >= 0);

ALTER TABLE item
    ADD CONSTRAINT chk_item_lead_time CHECK (lead_time_days >= 0);

-- loss_rate: 0~1 범위
ALTER TABLE item
    ADD CONSTRAINT chk_loss_rate CHECK (loss_rate >= 0 AND loss_rate <= 1);

-- 주문 수량 양수
ALTER TABLE order_cart_item
    ADD CONSTRAINT chk_cart_qty CHECK (pack_qty > 0);

-- 폐기 수량 양수
ALTER TABLE waste
    ADD CONSTRAINT chk_waste_qty CHECK (qty_base_unit > 0);

-- POS 판매 수량 양수
ALTER TABLE pos_sales
    ADD CONSTRAINT chk_pos_qty CHECK (qty > 0);

-- 월마감 금액 0 이상
ALTER TABLE monthly_closing
    ADD CONSTRAINT chk_closing_purchase CHECK (total_purchase_amount >= 0),
    ADD CONSTRAINT chk_closing_sales CHECK (total_sales_amount >= 0),
    ADD CONSTRAINT chk_closing_inventory CHECK (total_inventory_value >= 0);

-- conversion_qty 양수
ALTER TABLE item
    ADD CONSTRAINT chk_conversion_qty CHECK (conversion_qty > 0);

-- min_order_qty 양수
ALTER TABLE item
    ADD CONSTRAINT chk_min_order_qty CHECK (min_order_qty > 0);

-- ============================================================
-- 4. 금액 컬럼 정밀도 통일 (DECIMAL(12,2) → DECIMAL(15,2))
-- order_plan 대량 주문 시 overflow 방지
-- ============================================================

ALTER TABLE order_plan
    MODIFY COLUMN total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    MODIFY COLUMN vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 5. 기존 deprecated 컬럼 정리 안내 (실제 삭제는 안함)
-- item.category (VARCHAR) → category_id (FK) 사용으로 전환 완료
-- users.store_id → user_store 테이블로 전환 완료
-- 운영 안정화 후 별도 마이그레이션으로 DROP 예정
-- ============================================================
