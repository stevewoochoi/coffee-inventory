-- ============================================================
-- V38: Production Readiness - Audit Columns & NOT NULL Fixes
-- 상용 배포 전 감사 추적 및 데이터 무결성 보강
-- ============================================================

-- ============================================================
-- 1. 누락된 created_at / updated_at 컬럼 추가
-- ============================================================

-- supplier_item: 가격 변경 추적 불가 → 감사 컬럼 추가
ALTER TABLE supplier_item
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- order_line: 주문 라인 생성/수정 추적 불가
ALTER TABLE order_line
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- menu: 메뉴 생성/수정 추적 불가
ALTER TABLE menu
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- menu_option: 옵션 생성/수정 추적 불가
ALTER TABLE menu_option
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- recipe_component: 레시피 변경 추적 불가
ALTER TABLE recipe_component
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- physical_count_line: 실사 라인 감사 추적 불가
ALTER TABLE physical_count_line
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- inventory_audit_line: 감사 라인 추적 불가
ALTER TABLE inventory_audit_line
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- claim_line: 클레임 라인 추적 불가
ALTER TABLE claim_line
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- store_delivery_policy: 정책 매핑 추적 불가
ALTER TABLE store_delivery_policy
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- delivery_holiday: 휴일 등록 추적 불가
ALTER TABLE delivery_holiday
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- 2. updated_at 누락된 주요 테이블에 추가
-- ============================================================

-- company
ALTER TABLE company
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- brand
ALTER TABLE brand
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- store
ALTER TABLE store
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- users
ALTER TABLE users
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- item
ALTER TABLE item
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- packaging
ALTER TABLE packaging
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- supplier
ALTER TABLE supplier
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- item_category
ALTER TABLE item_category
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- delivery
ALTER TABLE delivery
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- order_plan
ALTER TABLE order_plan
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- physical_count
ALTER TABLE physical_count
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- inventory_audit
ALTER TABLE inventory_audit
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- cycle_count_session
ALTER TABLE cycle_count_session
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- cycle_count_line
ALTER TABLE cycle_count_line
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- waste
ALTER TABLE waste
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- push_subscription
ALTER TABLE push_subscription
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- user_store
ALTER TABLE user_store
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- inventory_snapshot: created_at 누락
ALTER TABLE inventory_snapshot
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- soldout_item
ALTER TABLE soldout_item
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- monthly_closing
ALTER TABLE monthly_closing
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- bulk_upload_batch
ALTER TABLE bulk_upload_batch
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
