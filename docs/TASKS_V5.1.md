# TASKS_V5.md - 매장 수발주 시스템 V1 전면 개편

> **참고 문서**: 할리스 점주앱 기획서(24p), 할리스 인터페이스 정의서(39 API), 할리스 WALD API 리스트(53 API),
> 할리스/벤티 수발주 주문 프로세스 플로우차트, V1 아키텍처 설계 문서
>
> **핵심 원칙**: 복잡한 운영 룰(배송요일/리드타임/컷오프/센터)은 **정책 엔진(PolicyService)**으로 캡슐화.
> 직원은 "수량"만 판단하고, 공급사/납품일/센터는 시스템이 자동 결정.

---

## 현재 문제점

1. 공급사 ID 직접 입력 → 발주 자체가 불가능
2. 납품일자 선택 없음 → 리드타임/배송요일 고려 불가
3. 장바구니 없음 → 여러 상품 한번에 발주 불가
4. 발주 추천이 비어있으면 할 수 있는 게 없음
5. 발주 전송/확정 흐름 없음
6. 발주↔입고 연결 없음 → 입고 시 발주 기반 자동채움 불가
7. 클레임/반품 시스템 없음
8. 재고실사(Physical Count) 없음
9. FIFO/유통기한/LOT 관리 없음
10. 풀필먼트(출고단계) 추적 없음

---

## 상태 머신 정의 (V1)

### OrderPlan (발주)
```
[내부 워크플로우 status]
DRAFT(작성중) → CONFIRMED(확정) → DISPATCHED(전송완료) → RECEIVED(입고완료)
                                                       → PARTIALLY_RECEIVED(부분입고)
         ↘ CANCELLED(취소) — cutoff_at 이전에만 가능

[물류 출고단계 fulfillment_status — 본사/센터용]
PENDING(대기) → PREPARING(출고예정) → SHIPPING(처리중/배송중) → DELIVERED(완료)
```

### Delivery (입고)
```
PENDING → IN_PROGRESS → COMPLETED → CANCELLED
```

### Claim (클레임)
```
SUBMITTED(접수) → IN_REVIEW(처리중) → RESOLVED(답변완료) → CLOSED(종결)
```

---

## PHASE 17: 발주 시스템 전면 개편

### TASK-054 | DB 스키마 보강 (Flyway V7__ordering_system.sql)

**A. 배송정책 테이블 (정책 엔진 기반)**
- [x] `delivery_policy` 테이블 — 납품일/컷오프/센터 규칙을 코드에 하드코딩하지 않고 DB화
  ```sql
  CREATE TABLE delivery_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    policy_name VARCHAR(100) NOT NULL,
    -- 배송요일 타입
    delivery_days VARCHAR(20) NOT NULL DEFAULT 'MON_WED_FRI',
      -- 'MON_WED_FRI' / 'TUE_THU_SAT' / 'EVERYDAY'
    -- 컷오프(주문마감) 규칙
    cutoff_time TIME NOT NULL DEFAULT '09:00:00',
    cutoff_lead_days_before INT NOT NULL DEFAULT 2,
      -- 09시 이전: D-2, 09시 이후: D-3 (할리스/벤티 공통)
    cutoff_lead_days_after INT NOT NULL DEFAULT 3,
    -- 센터/물류
    fulfillment_center VARCHAR(100),
    -- 온도대
    temperature_zone VARCHAR(20) DEFAULT 'AMBIENT',
      -- AMBIENT / CHILLED / FROZEN
    -- 활성 여부
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
  );
  ```
- [x] `store_delivery_policy` 매핑 테이블 (매장별 정책 배정)
  ```sql
  CREATE TABLE store_delivery_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    delivery_policy_id BIGINT NOT NULL,
    is_default TINYINT(1) DEFAULT 1,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (delivery_policy_id) REFERENCES delivery_policy(id)
  );
  ```
- [x] `delivery_holiday` 테이블 (공휴일/배송불가일)
  ```sql
  CREATE TABLE delivery_holiday (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    holiday_date DATE NOT NULL,
    description VARCHAR(200),
    UNIQUE KEY (brand_id, holiday_date)
  );
  ```

**B. 부재료 카테고리**
- [x] `item_category` 테이블
  ```sql
  CREATE TABLE item_category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    parent_id BIGINT,
    name VARCHAR(100) NOT NULL,
    level TINYINT NOT NULL DEFAULT 1,
      -- 1: 대분류, 2: 중분류, 3: 소분류 (할리스 PAPI_C0100~C0120 참고)
    display_order INT DEFAULT 0,
    icon VARCHAR(50),
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (parent_id) REFERENCES item_category(id)
  );
  ```

**C. items 테이블 확장**
- [x] 컬럼 추가
  ```sql
  ALTER TABLE items ADD COLUMN category_id BIGINT;
  ALTER TABLE items ADD COLUMN lead_time_days INT DEFAULT 2;
  ALTER TABLE items ADD COLUMN max_order_qty INT;
  ALTER TABLE items ADD COLUMN image_url VARCHAR(500);
  ALTER TABLE items ADD COLUMN temperature_zone VARCHAR(20) DEFAULT 'AMBIENT';
  ALTER TABLE items ADD COLUMN is_orderable TINYINT(1) DEFAULT 1;
  ```

**D. 장바구니 (매장 공유)**
- [x] `order_cart` 테이블
  ```sql
  CREATE TABLE order_cart (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_policy_id BIGINT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
      -- ACTIVE / SUBMITTED / EXPIRED
    created_by BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    UNIQUE KEY (store_id, delivery_date, status)
  );
  ```
- [x] `order_cart_item` 테이블
  ```sql
  CREATE TABLE order_cart_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    packaging_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2),
    recommended_qty INT,
    recommended_by_ai TINYINT(1) DEFAULT 0,
    added_by BIGINT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES order_cart(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (packaging_id) REFERENCES packagings(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );
  ```

**E. order_plan 테이블 확장**
- [x] 컬럼 추가
  ```sql
  ALTER TABLE order_plans ADD COLUMN delivery_date DATE;
  ALTER TABLE order_plans ADD COLUMN cutoff_at DATETIME;
  ALTER TABLE order_plans ADD COLUMN auto_confirmed_at DATETIME;
  ALTER TABLE order_plans ADD COLUMN fulfillment_status VARCHAR(20) DEFAULT 'PENDING';
    -- PENDING / PREPARING / SHIPPING / DELIVERED
  ALTER TABLE order_plans ADD COLUMN delivery_policy_id BIGINT;
  ALTER TABLE order_plans ADD COLUMN total_amount DECIMAL(12,2) DEFAULT 0;
  ALTER TABLE order_plans ADD COLUMN vat_amount DECIMAL(12,2) DEFAULT 0;
  ```

**F. delivery 테이블 확장 (발주↔입고 연결)**
- [x] 컬럼 추가
  ```sql
  ALTER TABLE deliveries ADD COLUMN ref_type VARCHAR(20);
    -- 'ORDER_PLAN' / 'MANUAL' / 'BARCODE_SCAN'
  ALTER TABLE deliveries ADD COLUMN ref_id BIGINT;
    -- ORDER_PLAN일 때 order_plan_id
  ```

**G. 클레임/반품 테이블**
- [x] `claim` 테이블
  ```sql
  CREATE TABLE claim (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    order_plan_id BIGINT,
    delivery_id BIGINT,
    claim_type VARCHAR(30) NOT NULL,
      -- DEFECTIVE / WRONG_ITEM / SHORTAGE / DAMAGE / QUALITY / OTHER
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
      -- SUBMITTED / IN_REVIEW / RESOLVED / CLOSED
    description TEXT,
    requested_action VARCHAR(30),
      -- REFUND / REPLACEMENT / CREDIT
    created_by BIGINT,
    resolved_by BIGINT,
    resolved_at DATETIME,
    resolution_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (order_plan_id) REFERENCES order_plans(id)
  );
  ```
- [x] `claim_line` 테이블
  ```sql
  CREATE TABLE claim_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    packaging_id BIGINT,
    claimed_qty INT NOT NULL,
    accepted_qty INT DEFAULT 0,
    reason TEXT,
    FOREIGN KEY (claim_id) REFERENCES claim(id) ON DELETE CASCADE
  );
  ```
- [x] `claim_image` 테이블 (사진 첨부 — 할리스 PAPI_R0160 참고)
  ```sql
  CREATE TABLE claim_image (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claim(id) ON DELETE CASCADE
  );
  ```

**H. 재고실사 테이블 (할리스 PAPI_I0010~I0030 참고)**
- [x] `inventory_audit` 테이블
  ```sql
  CREATE TABLE inventory_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    audit_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
      -- IN_PROGRESS / COMPLETED / CANCELLED
    created_by BIGINT,
    completed_by BIGINT,
    completed_at DATETIME,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );
  ```
- [x] `inventory_audit_line` 테이블
  ```sql
  CREATE TABLE inventory_audit_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    audit_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    system_qty DECIMAL(10,3) NOT NULL,
    actual_qty DECIMAL(10,3),
    difference DECIMAL(10,3) GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
    note TEXT,
    FOREIGN KEY (audit_id) REFERENCES inventory_audit(id) ON DELETE CASCADE
  );
  ```

- [x] 테스트: 전체 마이그레이션 정상 적용 확인 (빌드 성공)

---

### TASK-055 | 배송정책 엔진 (DeliveryPolicyService)

> **핵심**: 납품일/컷오프/리드타임/배송요일 규칙을 하드코딩하지 않고 정책 테이블 기반 캡슐화

- [x] `DeliveryPolicyService` 구현
  ```java
  public class DeliveryPolicyService {
    DeliveryPolicy getStorePolicy(Long storeId);
    List<AvailableDate> getAvailableDates(Long storeId, int maxDays);
    boolean isItemOrderableForDate(Long itemId, LocalDate deliveryDate, Long storeId);
    LocalDateTime calculateCutoff(LocalDate deliveryDate, DeliveryPolicy policy);
    OrderAvailability checkOrderAvailability(Long storeId, LocalDate deliveryDate);
  }
  ```
- [x] 납품일 계산 로직 (할리스/벤티 공통):
  - 현재시각 < cutoff_time(09:00) → D+cutoff_lead_days_before (D+2)
  - 현재시각 >= cutoff_time(09:00) → D+cutoff_lead_days_after (D+3)
  - 배송요일(MON_WED_FRI 등) 해당일만 활성
  - delivery_holiday 공휴일 제외, 일요일 제외
  - 아이템별 lead_time_days > 정책 기본값이면 더 늦은 날짜부터 가능
- [x] GET /api/v1/ordering/delivery-dates?storeId={id}
  ```json
  {
    "availableDates": [
      { "date": "2026-03-02", "dayOfWeek": "MON", "isRecommended": true,
        "orderDeadline": "2026-02-28T09:00:00" }
    ],
    "storeDeliveryType": "MON_WED_FRI",
    "cutoffTime": "09:00",
    "maxDisplayDays": 14
  }
  ```
- [x] GET /api/v1/ordering/availability?storeId={id}&deliveryDate={date}
  - 할리스 PAPI_R0020(주문가능상태조회) 참고
  - Response: `{ "available": true, "deadline": "...", "remainingMinutes": 480 }`
- [x] 테스트: 리드타임/배송요일/시간대별/공휴일 케이스

---

### TASK-056 | 부재료 카탈로그 API (발주용 상품조회)

> 할리스 PAPI_R0040(상품조회), PAPI_C0100~C0120(대/중/소분류) 참고

- [x] GET /api/v1/ordering/catalog?storeId={id}&deliveryDate={date}&categoryId={id}&keyword={검색어}&lowStockOnly={bool}&page&size
  - **정책 엔진 통과**: 선택 납품일에 주문 가능한 상품만 필터링
  - Response (각 상품):
    ```json
    {
      "itemId": 1, "itemName": "에티오피아 예가체프 원두", "itemCode": "CF-001",
      "categoryId": 3, "categoryName": "원두",
      "imageUrl": "/images/items/cf-001.jpg",
      "temperatureZone": "AMBIENT",
      "currentStock": 2.5, "unit": "kg", "minStock": 5.0, "isLowStock": true,
      "packagings": [
        { "packagingId": 7, "label": "1kg × 1봉", "unitsPerPack": 1.0,
          "unitPrice": 25000, "supplierId": 3, "supplierName": "원두상사", "maxOrderQty": 50 }
      ],
      "lastOrder": { "date": "2026-02-20", "quantity": 3 },
      "suggestedQty": 3, "suggestedByAi": false,
      "daysUntilEmpty": 2.1
    }
    ```
- [x] GET /api/v1/ordering/categories?brandId={id} — 3단계 카테고리 트리
- [x] 추천 발주 수량 (`OrderRecommendationService`)
  ```
  avg_daily_usage = 최근 7~28일 사용량 / 일수
  demand = avg_daily_usage × (lead_time_days + safety_days)
  target_stock = max(min_stock_qty, demand)
  recommended_qty = max(0, target_stock - current_stock)
  pack_qty = ceil(recommended_qty / units_per_pack)
  pack_qty = min(pack_qty, max_order_qty)
  ```
- [x] 테스트: 납품일 필터링, 추천 수량, 카테고리 트리

---

### TASK-057 | 장바구니 API (매장 공유)

> 벤티: 매장 단위 공유, 다른 기기에서도 이어서 작업(DB 저장)

- [x] POST /api/v1/ordering/cart — 장바구니 생성/추가
  - `{ storeId, deliveryDate, items: [{ itemId, packagingId, quantity }] }`
  - 매장+납품일 ACTIVE 장바구니 있으면 추가, 없으면 생성
  - 공급사 자동 매핑 (packaging → supplier_item)
  - 정책 엔진 검증
- [x] GET /api/v1/ordering/cart?storeId={id} — 공급사별 그룹핑 포함
- [x] PUT /api/v1/ordering/cart/items/{id} — 수량 변경
- [x] DELETE /api/v1/ordering/cart/items/{id} — 아이템 삭제
- [x] DELETE /api/v1/ordering/cart/{cartId} — 전체 삭제
- [x] 테스트: CRUD, 공유, 정책 검증

---

### TASK-058 | 발주 확정/전송 API

> 할리스 PAPI_R0060(주문등록), PAPI_R0090(주문수정/삭제) 참고

- [x] POST /api/v1/ordering/cart/{cartId}/confirm — 장바구니→발주 확정
  - 공급사별 OrderPlan 분리 생성 (status=CONFIRMED, fulfillment_status=PENDING)
  - cutoff_at / total_amount / vat_amount 계산
  - 장바구니 status=SUBMITTED
- [x] POST /api/v1/ordering/plans/{id}/cancel — 취소 (cutoff_at 이전만)
- [x] PUT /api/v1/ordering/plans/{id} — 수정 (CONFIRMED + cutoff 이전만)
- [x] 컷오프 자동확정 스케줄러 (`@Scheduled`)
  - 매일 09:00: CONFIRMED → DISPATCHED, auto_confirmed_at 기록
- [x] 테스트: 확정→취소→마감 흐름, VAT 계산

---

### TASK-059 | 발주 화면 전면 개편 (React)

- [x] `/store/ordering` 발주 메인 (장바구니 현황 + 저재고 알림 + 최근발주 + 신규발주 버튼)
- [x] `/store/ordering/new` 신규 발주 — **3단계 흐름**:
  - **STEP 1: 납품일 선택** — 캘린더(배송가능일만 활성), 배송타입/마감시간 안내
  - **STEP 2: 상품 선택** — 카테고리 탭, 검색, 저재고 상단, 소진예상일, +/- 수량, 사진/리스트 토글, 플로팅 장바구니 바
  - **STEP 3: 장바구니 & 발주 확정** — 공급사별 그룹핑, 수량 수정, VAT 포함 합계, 마감시간 안내, 확정 버튼
- [x] 발주 완료 화면 (요약 + 주문현황/메인 이동)
- [x] shadcn/ui + 모바일 최적화

---

### TASK-060 | 주문현황 & 수정 화면 (React)

> 할리스 PAPI_R0070~R0090 참고

- [x] GET /api/v1/ordering/plans?storeId&status&fulfillmentStatus&from&to
- [x] GET /api/v1/ordering/plans/{id}
- [x] `/store/ordering/history` — 상태별 탭, 발주 카드(상태 뱃지 + 풀필먼트 상태), 수정/취소/상세
- [x] 발주 상세 — 타임라인 (확정→전송→배송→입고) + 상품목록 + 금액
- [x] 발주 수정 (CONFIRMED + cutoff 이전만)

---

### TASK-061 | 빠른 재발주

- [x] GET /api/v1/ordering/history?storeId={id}&limit=10
- [x] POST /api/v1/ordering/reorder/{orderPlanId} — 장바구니 자동 채움 + 재고 반영 수량 재계산
- [x] React: 메인에서 "재발주" → 장바구니 이동

---

## PHASE 18: 발주 기반 입고 처리

### TASK-062 | 발주↔입고 연동

> 할리스 PAPI_R0100(입고조회) 참고

- [x] GET /api/v1/receiving/pending?storeId={id} — 입고 대기 발주 목록
- [x] POST /api/v1/receiving/from-order/{orderPlanId} — Delivery + 라인 자동 생성 (ref_type='ORDER_PLAN')
- [x] PUT /api/v1/receiving/deliveries/{id}/lines/{lineId} — 입고수량/유통기한/LOT 수정
- [x] PUT /api/v1/receiving/deliveries/{id}/confirm — 입고 확정 → ledger RECEIVE + snapshot 갱신
  - 전체입고 → RECEIVED / 부분입고 → PARTIALLY_RECEIVED
- [x] `/store/receiving` — [발주 기반 입고] / [바코드 스캔 입고] 탭
- [x] 테스트: 발주→입고 연동, 부분입고, 불일치 추적

---

## PHASE 19: 클레임/반품 시스템

> 할리스 PAPI_R0110~R0160 참고

### TASK-063 | 클레임 API

- [x] POST /api/v1/claims — 클레임 등록 (입고된 상품 기반)
- [x] POST /api/v1/claims/{id}/images — 사진 첨부
- [x] GET /api/v1/claims?storeId&status&from&to — 목록 조회
- [x] GET /api/v1/claims/{id} — 상세
- [x] PUT /api/v1/claims/{id}/resolve — 처리 완료 (관리자)
- [x] GET /api/v1/claims/categories — 클레임 분류 (할리스 PAPI_R0120)

### TASK-064 | 클레임 화면 (React)

- [x] `/store/claims` — 상태별 탭, 클레임 카드
- [x] `/store/claims/new` — 입고 내역 기반 상품 선택, 유형, 사진 촬영/업로드, 설명
- [x] `/store/claims/{id}` — 타임라인, 사진 갤러리, 본사 답변

---

## PHASE 20: 재고실사 (Physical Count)

> 할리스 PAPI_I0010~I0030 참고

### TASK-065 | 재고실사 API

- [x] GET /api/v1/inventory/audit/availability?storeId={id} — 실사 가능 여부
- [x] POST /api/v1/inventory/audit — 실사 시작 (inventory_snapshot 기반 라인 자동 생성)
- [x] GET /api/v1/inventory/audit?storeId={id} — 실사 목록
- [x] GET /api/v1/inventory/audit/{id} — 실사 상세
- [x] PUT /api/v1/inventory/audit/{id}/lines — 실제 수량 입력
- [x] PUT /api/v1/inventory/audit/{id}/complete — 완료 → StockLedger ADJUST 생성 → snapshot 갱신

### TASK-066 | 재고실사 화면 (React)

- [x] `/store/inventory/audit` — 목록
- [x] `/store/inventory/audit/new` — 품목 리스트, 실제 수량 입력, 차이 자동 계산, 카테고리 필터
- [x] `/store/inventory/audit/{id}` — 결과 (차이 요약, 금액 환산)

---

## PHASE 21: FIFO/유통기한/LOT 관리

### TASK-067 | 유통기한 알림 & FIFO

- [x] GET /api/v1/inventory/expiry-alerts?storeId={id} — D-7 이내 만료 임박 목록
- [x] GET /api/v1/inventory/snapshot/lots?storeId={id}&itemId={id} — LOT별 잔여수량 (FIFO 정렬)
- [x] 유통기한 알림 스케줄러 (매일 07:00) — D-7 주의, D-3 경고, D-0 만료
- [x] FIFO 차감 로직 (StockLedgerService) — 사용/판매 시 가장 오래된 LOT부터 차감
- [x] React: 유통기한 알림 위젯 + "폐기 등록" 바로가기

---

## PHASE 22: 매장 대시보드 고도화

### TASK-068 | 매장 대시보드 API

- [x] GET /api/v1/dashboard/store/{storeId}/today
  - todoCards: urgentOrderCount, pendingCartCount, pendingReceivingCount, expiryAlertCount, pendingClaimCount
  - inventorySummary: totalItems, normalCount, lowStockCount, outOfStockCount, expiringCount
  - recentOrders, consumptionTrend(7일)

### TASK-069 | 매장 대시보드 React 화면

- [x] `/store/dashboard` — 오늘 할 일 카드 5개, 재고 프로그레스바, 최근 발주, 빠른 액션 버튼 5개
  - [🛒발주] [📦입고] [📋실사] [🗑폐기] [📞클레임]

---

## PHASE 23: 재고 화면 개선

### TASK-070 | 재고 현황 화면 개선

- [x] 재고 게이지 바, 소진 예상일, "발주하기"→장바구니 추가, 카테고리 필터, 정렬 옵션

### TASK-071 | 빠른 재고 조정 & 소진 예측

- [x] POST /api/v1/inventory/adjust — 빠른 조정 (AUDIT/DAMAGE/WASTE/OTHER)
- [x] GET /api/v1/inventory/forecast?storeId={id} — 소진 예상일 (최근 7일 평균)
- [x] 재고 카드 인라인 조정 모달

---

## PHASE 24: 풀필먼트 & 품절관리 (본사/센터용)

> 벤티 출고단계 + 할리스 PAPI_M0010~M0040 참고

### TASK-072 | 풀필먼트 상태 관리 API (BRAND_ADMIN / FULFILLMENT 역할)

- [x] PUT /api/v1/admin/ordering/plans/{id}/fulfillment — 출고 상태 업데이트
- [x] GET /api/v1/admin/ordering/plans?status=DISPATCHED&fulfillmentStatus=PENDING — 처리 대기 목록

### TASK-073 | 품절관리 API (할리스 PAPI_M0010~M0040)

- [x] GET /api/v1/soldout/products?storeId={id} — 품절 상품 목록
- [x] POST /api/v1/soldout/register — 품절 등록
- [x] DELETE /api/v1/soldout/{id} — 품절 해제

---

## 구현 우선순위

| 순서 | 작업 | 이유 |
|------|------|------|
| 1 | TASK-054 | DB 스키마 — 모든 기능의 기반 |
| 2 | TASK-055 | 정책 엔진 (PolicyService) — 납품일/컷오프/리드타임 |
| 3 | TASK-056 | 카탈로그 API — 정책 통과 상품만 노출 |
| 4 | TASK-057 | 장바구니 API — 매장 공유 |
| 5 | TASK-058 | 발주 확정/전송/취소 + 컷오프 스케줄러 |
| 6 | TASK-059 | 발주 화면 3단계 (캘린더→상품→장바구니) |
| 7 | TASK-060 | 주문현황/수정 + 타임라인 |
| 8 | TASK-062 | 발주↔입고 연동 (자동채움) |
| 9 | TASK-063~064 | 클레임/반품 (사진첨부) |
| 10 | TASK-065~066 | 재고실사 (Physical Count) |
| 11 | TASK-067 | FIFO/유통기한/LOT |
| 12 | TASK-068~069 | 매장 대시보드 |
| 13 | TASK-070~071 | 재고 화면 + 소진예측 |
| 14 | TASK-061 | 빠른 재발주 |
| 15 | TASK-072~073 | 풀필먼트 + 품절관리 |

---

## AI 발주 추천 설계 (V1 규칙 + 향후 ML 대비)

### V1 기본 산식
```
avg_daily_usage = 최근 7~28일 사용량(stock_ledger SALE/USE) / 일수
demand = avg_daily_usage × (lead_time_days + safety_days)
target_stock = max(min_stock_qty, demand)
recommended_qty = max(0, target_stock - current_stock)
pack_qty = ceil(recommended_qty / units_per_pack)
pack_qty = min(pack_qty, max_order_qty)
```

### 정책 게이트 (필수)
AI 추천은 반드시 PolicyService 통과:
- 납품 가능한 입고일/센터/배송구분/온도대 확인
- 포장단위(units_per_pack) 기준 정수 pack_qty 변환
- 최대주문수량 초과 방지

### 향후 ML 대비 (Phase 2+)
- **학습 Label**: stockout_event(품절), waste_rate(폐기), inventory_turnover(회전일수)
- **피처**: 요일효과, 계절성, 프로모션, 날씨
- `recommended_by_ai=true` 플래그로 추적
- A/B 테스트 기반 점진적 전환

---

## 할리스 API 매핑 참조 (coffee-inventory 대응)

| 할리스 API | 기능 | coffee-inventory 대응 |
|---|---|---|
| PAPI_R0010 | 납품일자조회 | GET /api/v1/ordering/delivery-dates |
| PAPI_R0020 | 주문가능상태조회 | GET /api/v1/ordering/availability |
| PAPI_R0030 | 여신정보조회 | (Phase 2) |
| PAPI_R0040 | 상품조회 | GET /api/v1/ordering/catalog |
| PAPI_R0050 | 세트조회 | (Phase 2) |
| PAPI_R0060 | 주문등록 | POST /api/v1/ordering/cart/{id}/confirm |
| PAPI_R0070 | 주문내역조회 | GET /api/v1/ordering/plans |
| PAPI_R0080 | 주문상세조회 | GET /api/v1/ordering/plans/{id} |
| PAPI_R0090 | 주문수정(삭제) | PUT/DELETE /api/v1/ordering/plans/{id} |
| PAPI_R0100 | 입고조회 | GET /api/v1/receiving/pending |
| PAPI_R0110 | 클레임현황 | GET /api/v1/claims |
| PAPI_R0120 | 클레임분류 | GET /api/v1/claims/categories |
| PAPI_R0150 | 클레임등록 | POST /api/v1/claims |
| PAPI_R0160 | 클레임이미지 | POST /api/v1/claims/{id}/images |
| PAPI_I0010 | 재고실사가능여부 | GET /api/v1/inventory/audit/availability |
| PAPI_I0020 | 재고실사목록 | GET /api/v1/inventory/audit |
| PAPI_I0030 | 재고실사등록 | POST /api/v1/inventory/audit |
| PAPI_M0010 | 품절상품조회 | GET /api/v1/soldout/products |
| PAPI_M0030 | 품절등록 | POST /api/v1/soldout/register |
| PAPI_M0040 | 품절삭제 | DELETE /api/v1/soldout/{id} |
| PAPI_C0100~C0120 | 대/중/소분류 | GET /api/v1/ordering/categories |
| PAPI_E0010~E0030 | 여신/청구 | (Phase 2) |

---

## Phase 2 예정 (V1 이후)

- 여신/가상계좌 (할리스 PAPI_E0010~E0030)
- 세트상품 (할리스 PAPI_R0050)
- 매출관리 (할리스 PAPI_S0010~S0020): 매출요약, 영업일보, 시간대별
- 커뮤니티/공지 (할리스 PAPI_C0030~C0040)
- AS관리 (할리스 PAPI_C0060~C0090)
- 키오스크 터치키 (할리스 PAPI_M0050~M0080)
- 소통게시판 (할리스 PAPI_C0130~C0170)
- ML 추천 모델: 요일효과/계절성/프로모션 반영

---

## Claude Code 참고 사항

- **정책 엔진 필수**: delivery_policy 테이블 + DeliveryPolicyService. 배송요일/리드타임/컷오프 절대 하드코딩 X
- **발주 흐름**: 납품일 선택 → 상품 선택(정책 통과) → 장바구니(매장 공유) → 발주 확정(공급사별 분리)
- **공급사 ID 직접 입력 UI 완전 제거**: packaging → supplier_item 자동 매핑
- **cutoff_at 기반 수정/취소**: 마감 이전에만 가능
- **fulfillment_status**: status(워크플로우)와 별도로 물류 출고단계 관리
- **ref_type/ref_id 패턴**: delivery↔order 연결 (stock_ledger 동일 패턴)
- **실사 완료 → ADJUST ledger**: inventory_audit → 차이분 → StockLedger ADJUST → snapshot 갱신
- **기존 API 구조 유지**: ApiResponse<T>, /api/v1/
- **기존 엔티티 확장**: OrderPlan/OrderLine/Delivery에 컬럼 추가
- **모바일 퍼스트**: Tailwind + shadcn/ui
- **금액**: i18n 로케일 연동
