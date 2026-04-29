# TASKS_V7.md — 본사 창고 재고·발주 시스템 + 매장 재고 현황 뷰

> **추가 기능 2종**
> 1. **본사 창고 재고/발주**: BRAND_ADMIN이 자체 창고 재고를 관리하고 외부 공급사에 발주, 입고/실사/조정. 매장이 발주한 수량을 처리(출고)하면 창고 재고 자동 차감.
> 2. **매장 재고 현황 뷰**: BRAND_ADMIN이 매장을 선택해 해당 매장의 실사/현재 재고를 뷰잉(읽기 전용).
>
> **최우선 원칙 — 기존 시스템에 영향 0**
> - 모든 변경은 **additive only**: ADD COLUMN(전부 nullable 또는 default), 새 enum 값만 추가, 새 API/엔드포인트만 신설, 기존 메서드 시그니처 변경 금지
> - 기존 `/admin/inventory` 라우트는 그대로 유지(deprecate 표시만), 새 메뉴 2개를 사이드바에 추가
> - 신규 코드는 `domain/warehouse` 패키지로 격리. 기존 도메인은 메서드 추가만 허용

---

## 0. 핵심 설계 결정 (반드시 숙지)

### 결정 1 — "본사 창고"는 별도 엔티티가 아니라 `store_type='WAREHOUSE'`인 `Store`다

**이유**: 기존 `InventorySnapshot.store_id`, `StockLedger.store_id`, `OrderPlan.store_id` 인프라를 100% 재사용. FIFO/유통기한/실사/예측/입고 로직 전부 공짜로 동작.

```
store
├── store_type='STORE'      (매장 — Aoyama 등)
└── store_type='WAREHOUSE'  (본사 창고 — 신규)
```

### 결정 2 — 매장 발주의 `supplier` 중 일부는 본사 창고와 매핑된다

매장이 발주하는 공급사 중 본사가 직접 운영하는 창고가 있다. 이때 출고(fulfillment_status `SHIPPING`)가 일어나면 해당 창고에서 자동으로 재고 차감.

```
supplier (예: "본사 중앙물류")
└── internal_warehouse_store_id → store(WAREHOUSE).id
```

`internal_warehouse_store_id`가 NULL인 supplier는 외부 공급사로 기존 흐름 그대로 동작(영향 없음).

### 결정 3 — 새 LedgerType `SHIP_OUT`만 추가, 기존 5종 유지

```
RECEIVE, SELL, WASTE, DAMAGE_RECEIVE, ADJUST  (기존 — 변경 없음)
SHIP_OUT                                       (신규 — 창고→매장 출고)
```

매장 입장에서는 RECEIVE 그대로(영향 없음), 창고 입장에서만 SHIP_OUT.

### 결정 4 — 본사 발주 = `OrderPlan(store_id=warehouse.id, supplier_id=외부공급사)`

엔티티/테이블 추가 없음. 컨트롤러만 분리(`/api/v1/admin/warehouses/...`).

### 결정 5 — 매장 재고 현황 뷰는 신규 API 1개 + 신규 페이지 1개

기존 `inventoryApi.getForecast(storeId)`를 재사용하되, BRAND_ADMIN 권한 검증을 거치는 admin 전용 래퍼 컨트롤러 추가. 데이터는 매장이 일일 실사(`daily_physical_count`)로 올린 값을 그대로 노출.

---

## 1. 도메인 모델 변경 사항 (요약)

### 1.1 신규 컬럼 (전부 nullable / default)

| 테이블 | 컬럼 | 타입 | 기본값 | 의미 |
|---|---|---|---|---|
| `store` | `store_type` | VARCHAR(20) | 'STORE' | 'STORE' / 'WAREHOUSE' |
| `store` | `is_internal_warehouse` | TINYINT(1) | 0 | 본사 직영 창고 여부 |
| `supplier` | `internal_warehouse_store_id` | BIGINT | NULL | 매장 출고 시 차감할 본사 창고 |

### 1.2 신규 인덱스

```sql
CREATE INDEX idx_store_brand_type ON store(brand_id, store_type, status);
CREATE INDEX idx_supplier_internal_warehouse ON supplier(internal_warehouse_store_id);
```

### 1.3 신규 enum 값

`com.coffee.domain.inventory.entity.LedgerType`:
```java
public enum LedgerType {
    RECEIVE, SELL, WASTE, DAMAGE_RECEIVE, ADJUST,
    SHIP_OUT  // ← 신규
}
```

### 1.4 시드 데이터

각 활성 brand당 기본 WAREHOUSE store 1개 생성 (조건부 INSERT — 이미 있으면 skip).

---

# PHASE A — 본사 창고 재고·발주 시스템

## TASK-A1 | 기획자 — 본사 창고 기능 정의서

**산출물**: `docs/SPEC_WAREHOUSE.md`

### A1-1. 사용자 시나리오

1. **BRAND_ADMIN 로그인 → 사이드바 [재고] → [본사 창고 재고]** 클릭
2. 창고가 여러 개면 상단 셀렉터로 선택 (단일이면 자동 선택)
3. **재고 현황 화면**: 품목별 현재고, 최소재고, 소진 예상일, 유통기한 임박, 재고가치
4. **[발주하기]** 클릭 → 외부 공급사 선택 → 상품/수량/납품일 입력 → 확정
5. 발주 도착 → **[입고처리]** 탭 → 발주 선택 → 실수량/유통기한/LOT 입력 → 확정 → 재고 자동 증가
6. **[실사]** 탭 → 카테고리 선택 → 실제 수량 입력 → 차이 자동 계산 → 완료 → ADJUST ledger 생성
7. **[빠른 조정]** 버튼 → 사유(파손/오류/기타) + 수량 → ADJUST ledger 생성
8. (자동) 매장이 발주한 상품을 본사가 출고 처리하면 → SHIP_OUT ledger 자동 생성, 재고 차감

### A1-2. 화면 와이어프레임 (텍스트)

**`/admin/warehouse-inventory` — 본사 창고 메인**
```
[본사 창고 재고 ▼ 중앙물류센터]              [+ 발주하기] [+ 빠른조정]

┌─ 요약 카드 (4개) ────────────────────────────┐
│ 총 품목 │ 정상 │ 부족 │ 품절 │ 만료임박 │ 재고가치 │
└──────────────────────────────────────────────┘

[탭] 재고현황 | 발주관리 | 입고처리 | 실사 | 변동이력

▼ 재고현황 탭
[검색] [카테고리▼] [□ 부족만 보기]
┌─────────────────────────────────────────────────────────┐
│ 아이스컵 22oz   현재고: 320 ea  최소: 200  소진예상: 8일후│
│ ━━━━━━━━━━━━━━━━━━░░░░░  [발주]  [조정]                  │
│ LOT: BX240115 (240ea, 2025-12-31 만료)                  │
│      BX240220 (80ea,  2026-03-15 만료)                  │
└─────────────────────────────────────────────────────────┘
```

**`/admin/warehouse-inventory/order/new` — 본사 발주 신규**
```
[본사 발주 — 1단계: 공급사 & 납품일 선택]
공급사: [외부 공급사 ▼ — 내부창고 매핑된 supplier는 제외]
납품일: [📅 캘린더]
━━━━━━━━━━━━━━━━━━━━
[다음 단계 — 상품 선택]
```

**`/admin/warehouse-inventory/receiving` — 입고처리 탭**
```
[입고 대기 발주 (3건)]
┌──────────────────────────────────────────┐
│ #ORD-2046  ABC식자재  납품예정: 2026-05-02│
│   아이스컵 22oz × 100박스                 │
│   [입고처리 →]                            │
└──────────────────────────────────────────┘
```

**`/admin/warehouse-inventory/cycle-count/new` — 실사**
- 카테고리 탭, 품목별 시스템수량 vs 실제수량 입력, 차이 자동 표시
- 완료 → ADJUST ledger 일괄 생성

### A1-3. 권한 매트릭스

| 액션 | BRAND_ADMIN | KR_INVENTORY | KR_FINANCE | JP_ORDERER | FULFILLMENT | STORE_MANAGER |
|---|---|---|---|---|---|---|
| 창고 재고 조회 | ✅ | ✅ | ✅ (읽기) | — | — | — |
| 창고 발주 생성 | ✅ | ✅ | — | — | — | — |
| 창고 입고 처리 | ✅ | ✅ | — | — | ✅ | — |
| 창고 실사 | ✅ | ✅ | — | — | — | — |
| 창고 조정(ADJUST) | ✅ | ✅ | — | — | — | — |
| 매장 발주 출고 처리 | — | — | — | — | ✅ | — |

### A1-4. 비즈니스 룰

- **창고 재고는 항상 ≥ 0**. SHIP_OUT 시 잔량 부족하면 출고 차단(트랜잭션 롤백 + 에러 응답).
- **본사 발주 카탈로그**: 외부 공급사만 노출 (`internal_warehouse_store_id IS NULL` 인 supplier).
- **창고 실사 완료 → ADJUST ledger**: 차이가 있는 라인만 ledger 생성. 차이 0인 라인은 ledger 생성 안 함.
- **여러 창고 운영 가능**: brand당 WAREHOUSE store가 여러 개일 수 있음. 각 supplier는 1개 창고에만 매핑.
- **WAREHOUSE는 매장 목록에서 제외**: 기존 `/api/v1/stores?brandId=` 응답에서 WAREHOUSE 타입은 기본 필터링 (옵션으로 포함 가능).

---

## TASK-A2 | 백엔드 — DB 스키마

**파일**: `backend/src/main/resources/db/migration/V46__warehouse_store_type.sql`

```sql
-- ============================================================
-- V46 : Warehouse-as-Store + Internal Warehouse mapping
-- 모든 변경은 additive. 기존 데이터/쿼리에 영향 없음.
-- ============================================================

-- 1. store: 창고 타입 추가
ALTER TABLE store
  ADD COLUMN store_type VARCHAR(20) NOT NULL DEFAULT 'STORE'
    COMMENT 'STORE | WAREHOUSE',
  ADD COLUMN is_internal_warehouse TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '본사 직영 창고 여부 (브랜드 자체 창고)';

CREATE INDEX idx_store_brand_type
  ON store(brand_id, store_type, status);

-- 2. supplier: 내부 창고 매핑
ALTER TABLE supplier
  ADD COLUMN internal_warehouse_store_id BIGINT NULL
    COMMENT '매장 출고 시 차감할 본사 창고 (NULL이면 외부 공급사)';

ALTER TABLE supplier
  ADD CONSTRAINT fk_supplier_internal_warehouse
  FOREIGN KEY (internal_warehouse_store_id) REFERENCES store(id);

CREATE INDEX idx_supplier_internal_warehouse
  ON supplier(internal_warehouse_store_id);

-- 3. stock_ledger.type ENUM에 SHIP_OUT 추가
--    (현재 컬럼이 ENUM(...) 으로 정의되어 있다면 ALTER 필요. VARCHAR이면 자동.)
--    프로젝트 현황: VARCHAR이므로 별도 ALTER 불필요. JPA enum 매핑만 갱신.

-- 검증용 코멘트:
-- SELECT COLUMN_TYPE FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='stock_ledger' AND COLUMN_NAME='type';
```

**파일**: `backend/src/main/resources/db/migration/V47__seed_default_warehouse.sql`

```sql
-- 각 활성 brand에 기본 WAREHOUSE store 1개 자동 생성
-- (이미 WAREHOUSE가 있는 brand는 skip)
INSERT INTO store (brand_id, name, store_type, is_internal_warehouse,
                   status, timezone, created_at, updated_at)
SELECT b.id,
       CONCAT(b.name, ' 본사 창고'),
       'WAREHOUSE',
       1,
       'ACTIVE',
       'Asia/Tokyo',
       NOW(),
       NOW()
FROM brand b
WHERE b.id NOT IN (
  SELECT brand_id FROM store WHERE store_type = 'WAREHOUSE'
);
```

### A2-체크리스트
- [ ] V46/V47 작성, `mvn flyway:migrate` 통과
- [ ] 기존 데이터 손실 0건 검증 (`SELECT COUNT(*) FROM inventory_snapshot` before/after)
- [ ] 기존 store API 응답에 `store_type='STORE'` 자동 채워짐 확인

---

## TASK-A3 | 백엔드 — 엔티티 확장 (additive)

### A3-1. `Store` 엔티티 — 필드 2개 추가

**파일**: `backend/src/main/java/com/coffee/domain/org/entity/Store.java`

```java
// 기존 필드 모두 유지. 아래 2줄만 추가.

@Column(name = "store_type", nullable = false, length = 20)
@Builder.Default
private String storeType = "STORE";  // STORE | WAREHOUSE

@Column(name = "is_internal_warehouse", nullable = false)
@Builder.Default
private Boolean isInternalWarehouse = false;

// 헬퍼 메서드 추가
public boolean isWarehouse() {
    return "WAREHOUSE".equals(storeType);
}
```

### A3-2. `Supplier` 엔티티 — 필드 1개 추가

**파일**: `backend/src/main/java/com/coffee/domain/master/entity/Supplier.java`

```java
@Column(name = "internal_warehouse_store_id")
private Long internalWarehouseStoreId;

public boolean isInternalSupplier() {
    return internalWarehouseStoreId != null;
}
```

### A3-3. `LedgerType` enum 확장

**파일**: `backend/src/main/java/com/coffee/domain/inventory/entity/LedgerType.java`

```java
public enum LedgerType {
    RECEIVE,
    SELL,
    WASTE,
    DAMAGE_RECEIVE,
    ADJUST,
    SHIP_OUT   // ← 신규: 창고에서 매장으로 출고
}
```

### A3-체크리스트
- [ ] 빌드 통과 (`mvn -DskipTests compile`)
- [ ] 기존 LedgerType 사용처 전부 정상 (스위치문에 default 있는지 확인)
- [ ] StoreRepository에 `findByBrandIdAndStoreType(Long, String)` 추가

---

## TASK-A4 | 백엔드 — 신규 도메인 패키지 `domain/warehouse`

기존 도메인을 건드리지 않기 위해 신규 패키지 생성.

```
backend/src/main/java/com/coffee/domain/warehouse/
├── controller/
│   ├── WarehouseInventoryController.java
│   ├── WarehouseOrderController.java
│   ├── WarehouseReceivingController.java
│   ├── WarehouseCycleCountController.java
│   └── WarehouseShipmentController.java   (내부용 — 매장 출고 트리거)
├── service/
│   ├── WarehouseService.java               (창고 조회/검증)
│   ├── WarehouseInventoryService.java      (재고 조회 — 기존 InventoryService 위임)
│   ├── WarehouseOrderService.java          (본사 발주 — 기존 OrderService 위임)
│   ├── WarehouseReceivingService.java      (본사 입고 — 기존 DeliveryService 위임)
│   └── WarehouseShipmentService.java       (매장 출고 시 자동 차감 — 신규 핵심)
├── dto/
│   ├── WarehouseDto.java
│   ├── WarehouseInventoryDto.java
│   ├── WarehouseOrderRequest.java
│   ├── WarehouseReceiveRequest.java
│   └── WarehouseAdjustRequest.java
└── repository/
    └── (신규 X — 기존 StoreRepository, InventorySnapshotRepository 등 사용)
```

### A4-1. WarehouseService

```java
@Service
@RequiredArgsConstructor
public class WarehouseService {
    private final StoreRepository storeRepository;

    public List<Store> getWarehousesForBrand(Long brandId) {
        return storeRepository.findByBrandIdAndStoreTypeAndStatus(
            brandId, "WAREHOUSE", "ACTIVE");
    }

    public Store getWarehouse(Long warehouseId, Long brandId) {
        Store s = storeRepository.findById(warehouseId)
            .orElseThrow(() -> new NotFoundException("창고 없음"));
        if (!s.isWarehouse()) {
            throw new BadRequestException("WAREHOUSE 타입이 아님");
        }
        if (!s.getBrandId().equals(brandId)) {
            throw new ForbiddenException("권한 없음");
        }
        return s;
    }
}
```

### A4-2. WarehouseShipmentService — **핵심**

매장의 OrderPlan이 fulfillment_status `SHIPPING`으로 전환될 때 호출됨.
이미 존재하는 `OrderFulfillmentService`(또는 동등 위치)에서 이 서비스를 **after-commit hook**으로 호출.

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseShipmentService {
    private final SupplierRepository supplierRepository;
    private final OrderLineRepository orderLineRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final StockLedgerRepository ledgerRepository;
    private final FifoStockService fifoStockService;  // 기존

    /**
     * 매장 OrderPlan의 fulfillment가 SHIPPING으로 전환될 때 호출.
     * supplier가 내부 창고 매핑된 경우에만 SHIP_OUT ledger 생성 + snapshot 차감.
     * 잔량 부족 시 InsufficientStockException 던짐 → 호출자 트랜잭션 롤백.
     */
    @Transactional
    public void shipFromWarehouse(OrderPlan plan, Long actorUserId) {
        Supplier supplier = supplierRepository.findById(plan.getSupplierId())
            .orElseThrow();
        if (!supplier.isInternalSupplier()) {
            return;  // 외부 공급사면 아무 것도 안 함 (영향 없음)
        }
        Long warehouseStoreId = supplier.getInternalWarehouseStoreId();
        List<OrderLine> lines = orderLineRepository.findByOrderPlanId(plan.getId());

        for (OrderLine line : lines) {
            BigDecimal qty = BigDecimal.valueOf(line.getQuantity())
                .multiply(BigDecimal.valueOf(line.getUnitsPerPack()));
            // FIFO 차감 (기존 로직 재사용)
            fifoStockService.consumeFifo(
                warehouseStoreId, line.getItemId(), qty,
                LedgerType.SHIP_OUT,
                "ORDER_PLAN", plan.getId(),
                "매장 #" + plan.getStoreId() + " 출고",
                actorUserId
            );
        }
        log.info("Warehouse SHIP_OUT done. plan={}, warehouse={}",
            plan.getId(), warehouseStoreId);
    }
}
```

> **`FifoStockService.consumeFifo` 시그니처가 위와 다르면 ARCHITECT가 매핑 결정.** 핵심은 기존 FIFO 로직 재사용이지 새 구현 X.

### A4-3. 매장 출고 hook 연결 지점

**검색 키워드**: `fulfillment_status`, `SHIPPING`, `setFulfillmentStatus`

기존 코드에서 OrderPlan의 fulfillmentStatus가 `SHIPPING`으로 전환되는 지점을 찾아 (보통 `OrderingService` 또는 `FulfillmentController`) **트랜잭션 내부 마지막**에 다음 호출 추가:

```java
// 기존 fulfillmentStatus 변경 코드 직후
warehouseShipmentService.shipFromWarehouse(orderPlan, currentUserId);
```

> 호출 위치는 ARCHITECT가 정확히 지정. 단 1줄 호출로 끝나야 함.

### A4-체크리스트
- [ ] 신규 파일은 모두 `domain/warehouse` 하위에 생성
- [ ] 기존 도메인 파일은 hook 호출 1줄 추가 외엔 수정 X
- [ ] 외부 공급사 OrderPlan 처리 시 `WarehouseShipmentService`가 no-op으로 빠지는 경로 검증

---

## TASK-A5 | 백엔드 — 신규 API 컨트롤러

> 모든 엔드포인트는 `/api/v1/admin/warehouses/...` 네임스페이스. BRAND_ADMIN/KR_INVENTORY 권한 필수.

### A5-1. WarehouseInventoryController

```java
@RestController
@RequestMapping("/api/v1/admin/warehouses")
@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY','KR_FINANCE')")
public class WarehouseInventoryController {

    // 본인 brand의 창고 목록
    @GetMapping
    public ApiResponse<List<WarehouseDto>> listWarehouses(
        @AuthenticationPrincipal UserPrincipal user
    );

    // 창고 재고 (forecast 재사용 — currentStock, minStock, daysToOut, lots)
    @GetMapping("/{warehouseId}/inventory")
    public ApiResponse<WarehouseInventoryResponse> getInventory(
        @PathVariable Long warehouseId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) Boolean lowStockOnly,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 빠른 조정 (ADJUST ledger 1건 생성)
    @PostMapping("/{warehouseId}/inventory/adjust")
    public ApiResponse<Void> adjust(
        @PathVariable Long warehouseId,
        @Valid @RequestBody WarehouseAdjustRequest req,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 변동 이력 (StockLedger 조회)
    @GetMapping("/{warehouseId}/inventory/ledger")
    public ApiResponse<Page<StockLedgerDto>> getLedger(
        @PathVariable Long warehouseId,
        @RequestParam(required = false) Long itemId,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        Pageable pageable,
        @AuthenticationPrincipal UserPrincipal user
    );
}
```

### A5-2. WarehouseOrderController

```java
@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/orders")
@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY')")
public class WarehouseOrderController {

    // 외부 공급사 카탈로그 (internal_warehouse_store_id IS NULL인 supplier만)
    @GetMapping("/catalog/suppliers")
    public ApiResponse<List<SupplierDto>> getExternalSuppliers(...);

    // 발주 생성 (OrderPlan(store_id=warehouseId) 1건 + OrderLine N건)
    @PostMapping
    public ApiResponse<OrderPlanDto> create(
        @PathVariable Long warehouseId,
        @Valid @RequestBody WarehouseOrderRequest req,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 발주 목록
    @GetMapping
    public ApiResponse<Page<OrderPlanDto>> list(
        @PathVariable Long warehouseId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        Pageable pageable
    );

    // 발주 상세
    @GetMapping("/{orderId}")
    public ApiResponse<OrderPlanDetailDto> detail(
        @PathVariable Long warehouseId,
        @PathVariable Long orderId
    );

    // 발주 취소 (cutoff 이전만 — 기존 정책 적용)
    @PostMapping("/{orderId}/cancel")
    public ApiResponse<Void> cancel(...);
}
```

### A5-3. WarehouseReceivingController

```java
@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/receiving")
@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY','FULFILLMENT')")
public class WarehouseReceivingController {

    // 입고 대기 목록 (DISPATCHED인 본사 발주)
    @GetMapping("/pending")
    public ApiResponse<List<OrderPlanDto>> pending(@PathVariable Long warehouseId);

    // 발주 기반 입고 시작 (Delivery 자동 생성)
    @PostMapping("/from-order/{orderId}")
    public ApiResponse<DeliveryDto> startFromOrder(
        @PathVariable Long warehouseId,
        @PathVariable Long orderId
    );

    // 입고 라인 수정 (실수량/유통기한/LOT)
    @PutMapping("/deliveries/{deliveryId}/lines/{lineId}")
    public ApiResponse<Void> updateLine(...);

    // 입고 확정 (RECEIVE ledger + snapshot 갱신)
    @PostMapping("/deliveries/{deliveryId}/confirm")
    public ApiResponse<Void> confirm(...);
}
```

### A5-4. WarehouseCycleCountController

```java
@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/cycle-count")
@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY')")
public class WarehouseCycleCountController {

    // 기존 CycleCountService 위임. 단 storeId=warehouseId로 호출.
    @PostMapping
    public ApiResponse<CycleCountSessionDto> start(...);

    @GetMapping
    public ApiResponse<List<CycleCountSessionDto>> list(...);

    @GetMapping("/{sessionId}")
    public ApiResponse<CycleCountSessionDetailDto> detail(...);

    @PutMapping("/{sessionId}/lines")
    public ApiResponse<Void> updateLines(...);

    @PostMapping("/{sessionId}/complete")
    public ApiResponse<Void> complete(...);
}
```

### A5-체크리스트
- [ ] 모든 컨트롤러에 `@PreAuthorize` 명시
- [ ] 모든 엔드포인트에서 warehouseId의 brandId == 현재 유저의 brandId 검증
- [ ] ApiResponse<T> 패턴 일관 적용
- [ ] OpenAPI(Swagger) 그룹: `warehouse`로 분리

---

## TASK-A6 | 백엔드 — 매장 발주 출고 hook 연결

### A6-1. 출고 시점 식별

기존 코드에서 OrderPlan.fulfillmentStatus를 `SHIPPING`으로 변경하는 지점을 정확히 찾는다:

```bash
grep -rn "fulfillmentStatus" backend/src/main/java --include="*.java"
grep -rn "SHIPPING" backend/src/main/java --include="*.java"
```

찾은 위치(보통 OrderingService 또는 FulfillmentController)의 트랜잭션 내부, **상태 변경 직후**에 hook 추가.

### A6-2. Hook 호출

```java
// 기존
orderPlan.setFulfillmentStatus("SHIPPING");

// 추가 (매장 → 본사 창고 차감)
warehouseShipmentService.shipFromWarehouse(orderPlan, currentUserId);
```

### A6-3. 외부 공급사 보호

`shipFromWarehouse` 첫 줄의 `if (!supplier.isInternalSupplier()) return;` 가드로 외부 supplier는 영향 0.
회귀 테스트(T-A8)로 외부 supplier 출고 흐름 통과 확인 필수.

### A6-체크리스트
- [ ] hook 위치 1곳만 추가 (여러 곳에 추가 금지 — 중복 차감 위험)
- [ ] 잔량 부족 시 명확한 에러 응답 (HTTP 409 + 에러코드 `WAREHOUSE_INSUFFICIENT_STOCK`)
- [ ] hook 추가 전후 기존 발주/출고 E2E 테스트 통과

---

# PHASE B — 매장 재고 현황 뷰 (BRAND_ADMIN 읽기 전용)

## TASK-B1 | 기획자 — 매장 재고 현황 뷰 정의서

**산출물**: `docs/SPEC_STORE_INVENTORY_VIEW.md`

### B1-1. 사용자 시나리오

1. BRAND_ADMIN → 사이드바 [재고] → [매장 재고 현황] 클릭
2. 상단 매장 셀렉터(필수) — 본인 brand의 STORE 타입만 노출 (WAREHOUSE 제외)
3. 매장 선택 → 해당 매장의 재고 현황 표시
4. 데이터 출처: `inventory_snapshot` (최신 상태) + 최근 `daily_physical_count` 라인 (실사 결과)
5. **읽기 전용** — 조정/발주/실사 버튼 없음. 단, **[엑셀 다운로드]** 가능.

### B1-2. 화면 와이어프레임

**`/admin/store-inventory`**
```
[매장 재고 현황]
매장 선택: [Aoyama 점 ▼]   조회일: [2026-04-30]   [엑셀 다운로드]

매장 정보: Aoyama / 도쿄 / 영업중 / 마지막 실사: 2026-04-29 09:30 (담당: 김매니저)

요약: 총 72품목 | 정상 58 | 부족 9 | 품절 5 | 만료임박 3 | 재고가치 ¥847,200

[탭] 재고현황 | 최근 실사 | 변동이력

▼ 재고현황
┌──────────────────────────────────────────────────────────┐
│ 아이스컵 22oz    현재고: 142  최소: 100  소진예상: 5일후 │
│ 마지막 실사: 2026-04-29 (140 → 142, 차이 +2)              │
└──────────────────────────────────────────────────────────┘
...
```

### B1-3. 데이터 정합성 룰

- 표시되는 "현재고"는 `inventory_snapshot`의 SUM(qty_base_unit) 기준 (실시간)
- "마지막 실사값"은 `daily_physical_count` 가장 최근 완료 세션의 라인값
- 둘이 다를 수 있음 (실사 후 매장에서 사용/수령 발생) → UI에서 둘 다 보여줌
- BRAND_ADMIN은 매장의 어떤 데이터도 변경 불가

### B1-4. 권한

| 액션 | BRAND_ADMIN | KR_INVENTORY | KR_FINANCE | STORE_MANAGER |
|---|---|---|---|---|
| 모든 매장 재고 조회 | ✅ | ✅ | ✅ | — (자기 매장만) |
| 엑셀 다운로드 | ✅ | ✅ | ✅ | — |

---

## TASK-B2 | 백엔드 — 매장 재고 뷰 API

기존 `InventoryService.getForecast(storeId)`를 위임 호출. **신규 비즈니스 로직 0**, 권한 검증 래퍼만 추가.

### B2-1. AdminStoreInventoryController

```java
@RestController
@RequestMapping("/api/v1/admin/stores")
@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY','KR_FINANCE')")
public class AdminStoreInventoryController {

    private final StoreService storeService;
    private final InventoryService inventoryService;
    private final DailyPhysicalCountService dailyPhysicalCountService;

    // brand의 STORE 타입 매장 목록 (WAREHOUSE 제외)
    @GetMapping
    public ApiResponse<List<StoreDto>> listStores(
        @AuthenticationPrincipal UserPrincipal user
    );

    // 특정 매장 재고 (forecast 위임)
    @GetMapping("/{storeId}/inventory")
    public ApiResponse<StoreInventoryResponse> getInventory(
        @PathVariable Long storeId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) Boolean lowStockOnly,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 매장의 최근 실사 결과
    @GetMapping("/{storeId}/inventory/last-count")
    public ApiResponse<DailyPhysicalCountDto> getLastCount(
        @PathVariable Long storeId,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 변동 이력 (StockLedger 조회 — 위임)
    @GetMapping("/{storeId}/inventory/ledger")
    public ApiResponse<Page<StockLedgerDto>> getLedger(
        @PathVariable Long storeId,
        @RequestParam(required = false) Long itemId,
        @RequestParam(required = false) String type,
        Pageable pageable,
        @AuthenticationPrincipal UserPrincipal user
    );

    // 엑셀 다운로드 (Apache POI)
    @GetMapping(value="/{storeId}/inventory/export", produces=MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> exportExcel(
        @PathVariable Long storeId,
        @AuthenticationPrincipal UserPrincipal user
    );
}
```

### B2-2. 핵심 가드

```java
private void assertSameBrand(Long storeId, Long brandId) {
    Store s = storeService.findById(storeId);
    if (!s.getBrandId().equals(brandId)) {
        throw new ForbiddenException("다른 brand 매장 접근 금지");
    }
    if ("WAREHOUSE".equals(s.getStoreType())) {
        throw new BadRequestException("이 API는 STORE 전용. 창고는 /api/v1/admin/warehouses 사용");
    }
}
```

### B2-3. StoreRepository 신규 메서드 (additive)

```java
// 기존 findByBrandId(...) 유지. 아래 추가만.
List<Store> findByBrandIdAndStoreTypeAndStatus(
    Long brandId, String storeType, String status);
```

### B2-체크리스트
- [ ] 기존 `InventoryService.getForecast` 시그니처 변경 없음 (위임만)
- [ ] WAREHOUSE 타입 store가 이 API에서 차단되는지 검증
- [ ] 다른 brand 매장 접근 시 403 검증
- [ ] 엑셀 다운로드: 컬럼 = 품목명/카테고리/현재고/최소재고/소진예상일/마지막실사/실사수량/차이/단가/재고가치

---

# PHASE C — 프론트엔드

## TASK-C1 | 프론트엔드 — 사이드바 메뉴 추가 + 라우팅

### C1-1. 라우트 추가

**파일**: `frontend/src/App.tsx`

```tsx
// 기존 /admin/inventory 라우트 유지 (legacy redirect)
<Route path="/admin/inventory"
  element={<Navigate to="/admin/store-inventory" replace />} />

// 신규 — 본사 창고
<Route path="/admin/warehouse-inventory"
  element={<WarehouseInventoryPage />} />
<Route path="/admin/warehouse-inventory/order/new"
  element={<WarehouseOrderNewPage />} />
<Route path="/admin/warehouse-inventory/order/:id"
  element={<WarehouseOrderDetailPage />} />
<Route path="/admin/warehouse-inventory/receiving"
  element={<WarehouseReceivingPage />} />
<Route path="/admin/warehouse-inventory/receiving/:orderId"
  element={<WarehouseReceivingDetailPage />} />
<Route path="/admin/warehouse-inventory/cycle-count"
  element={<WarehouseCycleCountListPage />} />
<Route path="/admin/warehouse-inventory/cycle-count/new"
  element={<WarehouseCycleCountNewPage />} />
<Route path="/admin/warehouse-inventory/cycle-count/:id"
  element={<WarehouseCycleCountDetailPage />} />

// 신규 — 매장 재고 뷰
<Route path="/admin/store-inventory"
  element={<StoreInventoryViewPage />} />
```

### C1-2. 사이드바 메뉴

기존 [재고] 메뉴 그룹 안에:
```
재고
  ├─ 본사 창고 재고     → /admin/warehouse-inventory
  └─ 매장 재고 현황     → /admin/store-inventory
```

기존 `[재고관리]` 단일 항목은 `매장 재고 현황`으로 리디렉션 (사용자 혼동 방지).

### C1-체크리스트
- [ ] 기존 InventoryAdminPage 컴포넌트는 유지(혹시 모를 외부 링크 호환). 라우트만 redirect로 변경
- [ ] 권한별 메뉴 노출 (BRAND_ADMIN/KR_INVENTORY만 두 메뉴 모두 보임)

---

## TASK-C2 | 프론트엔드 — 본사 창고 페이지 (Phase A의 UI)

### C2-1. API 클라이언트

**파일**: `frontend/src/api/warehouse.ts` (신규)

```typescript
export const warehouseApi = {
  list: () => api.get<ApiResponse<Warehouse[]>>('/admin/warehouses'),
  getInventory: (warehouseId: number, params?: ...) => ...,
  adjust: (warehouseId: number, body: WarehouseAdjustRequest) => ...,
  getLedger: (warehouseId: number, params?: ...) => ...,

  // orders
  listOrders: (warehouseId: number, params?: ...) => ...,
  createOrder: (warehouseId: number, body: WarehouseOrderRequest) => ...,
  getOrder: (warehouseId: number, orderId: number) => ...,
  cancelOrder: (warehouseId: number, orderId: number) => ...,
  getExternalSuppliers: (warehouseId: number) => ...,

  // receiving
  pendingReceipts: (warehouseId: number) => ...,
  startReceiving: (warehouseId: number, orderId: number) => ...,
  updateReceivingLine: (warehouseId: number, deliveryId: number, lineId: number, body) => ...,
  confirmReceiving: (warehouseId: number, deliveryId: number) => ...,

  // cycle count
  startCycleCount: (warehouseId: number, body) => ...,
  listCycleCounts: (warehouseId: number) => ...,
  getCycleCount: (warehouseId: number, sessionId: number) => ...,
  updateCycleCountLines: (warehouseId: number, sessionId: number, body) => ...,
  completeCycleCount: (warehouseId: number, sessionId: number) => ...,
};
```

### C2-2. 페이지 컴포넌트

다음 페이지를 shadcn/ui + Tailwind로 구현 (기존 store 페이지들의 패턴 따라):

| 파일 | 라우트 | 핵심 UI |
|---|---|---|
| `WarehouseInventoryPage.tsx` | `/admin/warehouse-inventory` | 창고 셀렉터, 요약 카드 6개, 탭(재고/발주/입고/실사/이력), 재고 테이블 |
| `WarehouseOrderNewPage.tsx` | `.../order/new` | 공급사+납품일 → 카테고리/검색/수량 → 확정 모달 |
| `WarehouseOrderDetailPage.tsx` | `.../order/:id` | 상태 타임라인, 라인 목록, 취소 버튼 |
| `WarehouseReceivingPage.tsx` | `.../receiving` | 입고대기 발주 카드 목록 |
| `WarehouseReceivingDetailPage.tsx` | `.../receiving/:orderId` | 라인별 실수량/유통기한/LOT 입력, 확정 |
| `WarehouseCycleCountListPage.tsx` | `.../cycle-count` | 세션 목록 |
| `WarehouseCycleCountNewPage.tsx` | `.../cycle-count/new` | 카테고리 탭, 시스템 수량 vs 실제 수량 입력 |
| `WarehouseCycleCountDetailPage.tsx` | `.../cycle-count/:id` | 결과 요약, 차이 라인 강조 |

### C2-체크리스트
- [ ] 모든 폼은 react-hook-form + zod
- [ ] 모든 페이지에 빈 상태(empty state) UI
- [ ] 잔량 부족 등 백엔드 에러는 toast.error로 표시
- [ ] 모바일 반응형 (BRAND_ADMIN은 데스크탑 위주이지만 깨지지 않을 정도)

---

## TASK-C3 | 프론트엔드 — 매장 재고 현황 뷰 페이지

### C3-1. API 클라이언트

**파일**: `frontend/src/api/adminStoreInventory.ts`

```typescript
export const adminStoreInventoryApi = {
  listStores: () => api.get<ApiResponse<Store[]>>('/admin/stores'),
  getInventory: (storeId: number, params?: ...) => ...,
  getLastCount: (storeId: number) => ...,
  getLedger: (storeId: number, params?: ...) => ...,
  exportExcel: (storeId: number) =>
    api.get(`/admin/stores/${storeId}/inventory/export`, { responseType: 'blob' }),
};
```

### C3-2. `StoreInventoryViewPage.tsx`

**파일**: `frontend/src/pages/admin/StoreInventoryViewPage.tsx`

핵심 동작:
1. 마운트 시 `listStores()` → `<Select>`에 매장 목록
2. 매장 선택 시 `getInventory(storeId)` + `getLastCount(storeId)` 동시 호출
3. 요약 카드 + 재고 테이블 + 탭 (재고/실사/이력)
4. **읽기 전용** — 조정/발주/실사 버튼 절대 X
5. [엑셀 다운로드] 버튼 → blob → 파일 저장 (file-saver)

### C3-체크리스트
- [ ] WAREHOUSE 타입 매장은 셀렉터에 노출되지 않음 (백엔드에서도 막지만 프론트에서도 한 번 더)
- [ ] 매장 미선택 시 안내 빈 상태
- [ ] 마지막 실사 시각/담당자 명확히 표시

---

# PHASE D — 테스트

## TASK-D1 | 테스터 — 단위 테스트 (백엔드)

### T-A1: V46 마이그레이션 검증
- `@SpringBootTest` + Testcontainers MySQL
- 마이그레이션 적용 후 `store.store_type` 컬럼 존재, default='STORE' 적용 검증
- 기존 store row의 store_type이 'STORE'로 채워지는지 검증

### T-A2: V47 시드 검증
- 활성 brand 1개 → V47 적용 → WAREHOUSE store 1개 자동 생성 검증
- 같은 마이그레이션 두 번 실행해도 중복 생성 안 되는지 (FlywayCleanThenMigrate가 아닌 한)

### T-A3: WarehouseService 단위 테스트
- `@MockitoExtension`
- `getWarehousesForBrand`: STORE 타입 제외, ACTIVE만 반환
- `getWarehouse`: 다른 brand 접근 시 ForbiddenException
- `getWarehouse`: storeType이 'STORE'인 id 전달 시 BadRequestException

### T-A4: WarehouseShipmentService 단위 테스트 (★최우선)
- 외부 공급사 OrderPlan: 호출해도 ledger 0건 (no-op)
- 내부 공급사 OrderPlan, 잔량 충분: SHIP_OUT ledger N건 + snapshot 차감 확인
- 내부 공급사 OrderPlan, 잔량 부족: `InsufficientStockException` + 트랜잭션 롤백 (snapshot 변경 0)
- FIFO: 두 LOT (오래된 것 100, 새 것 50) → 120 출고 시 오래된 것 0, 새 것 30 남는지

### T-A5: WarehouseInventoryController 단위 테스트
- `@WebMvcTest`
- BRAND_ADMIN 권한으로 GET 200, STORE_MANAGER 권한으로 403
- 다른 brand의 warehouseId 요청 시 403

### T-A6: WarehouseOrderController 단위 테스트
- 외부 공급사 카탈로그가 internal_warehouse_store_id IS NULL인 supplier만 반환
- 본사 발주 생성 → OrderPlan(store_id=warehouseId) 생성 확인
- cutoff 이후 cancel → 400

### T-A7: WarehouseCycleCountController 단위 테스트
- 시작 → 라인 자동 생성 (현 snapshot 기준)
- 라인 입력 → complete → 차이가 있는 라인만 ADJUST ledger 생성 검증

### T-A8: ★회귀 — 외부 공급사 발주 흐름 (영향 0 검증)
- 외부 supplier(internal_warehouse_store_id=NULL) 매장 발주 생성 → confirm → SHIPPING 전환
- 검증: warehouse 재고 변동 0, ledger 변동 0
- 검증: 매장 RECEIVE 시 매장 snapshot 정상 증가 (기존 동작 그대로)

### T-B1: AdminStoreInventoryController 단위 테스트
- `listStores`: WAREHOUSE 타입 제외 검증
- `getInventory`: 다른 brand 매장 접근 시 403
- `getInventory`: WAREHOUSE 타입 storeId 전달 시 400 + 안내 메시지
- 엑셀 다운로드: Content-Type, 파일명, 시트의 헤더 행 검증

---

## TASK-D2 | 테스터 — 통합 테스트 (백엔드 E2E)

### IT-A1: 본사 발주 → 입고 → 재고 증가 풀 플로우
1. WAREHOUSE store 1개 (시드)
2. 외부 공급사 1개, 상품 1개 (시드)
3. POST /admin/warehouses/{id}/orders → 200, OrderPlan 생성
4. POST .../orders/{orderId}/confirm → 상태 CONFIRMED
5. (테스트용) DISPATCHED로 강제 전환
6. POST .../receiving/from-order/{orderId} → Delivery 생성
7. PUT .../receiving/deliveries/{id}/lines/{lineId} → 실수량/유통기한 입력
8. POST .../receiving/deliveries/{id}/confirm → 200
9. GET .../inventory → 해당 item의 currentStock이 실수량만큼 증가 검증
10. GET .../inventory/ledger → RECEIVE ledger 1건 검증

### IT-A2: 매장 발주 → 본사 출고 → 창고 차감 풀 플로우 (★핵심)
1. WAREHOUSE store 1개, 그 안에 item 100ea snapshot 시드
2. supplier 생성 (internal_warehouse_store_id = warehouse.id)
3. STORE store 1개 (Aoyama)
4. 매장에서 supplier로 30ea 발주 → confirm → DISPATCHED
5. 풀필먼트 SHIPPING 전환 트리거
6. 검증: warehouse snapshot = 70ea (100 - 30)
7. 검증: warehouse ledger SHIP_OUT 1건, refType='ORDER_PLAN', refId=발주ID
8. 검증: store snapshot 변동 없음 (아직 입고 전)
9. 매장 입고 처리 → store snapshot = 30ea (기존 흐름)

### IT-A3: 잔량 부족 시 출고 차단
1. WAREHOUSE에 item 10ea
2. 매장 발주 30ea, 동일 item, internal supplier
3. SHIPPING 전환 시도 → 409 + WAREHOUSE_INSUFFICIENT_STOCK
4. 검증: warehouse snapshot = 10ea (변동 0), ledger 변동 0
5. 검증: order plan의 fulfillment_status는 SHIPPING으로 전환되지 않음 (롤백)

### IT-A4: 본사 창고 실사 → ADJUST 반영
1. WAREHOUSE에 item 100ea
2. POST .../cycle-count → 세션 생성, 라인 자동 생성
3. PUT .../lines → 실제수량 95 입력
4. POST .../complete → 200
5. 검증: snapshot = 95ea, ledger ADJUST 1건 (-5)

### IT-B1: 매장 재고 뷰 — 다른 brand 차단
1. brand A의 admin 토큰
2. brand B 소속 매장 storeId로 /admin/stores/{storeId}/inventory → 403

### IT-B2: 매장 재고 뷰 — WAREHOUSE 차단
1. WAREHOUSE storeId로 /admin/stores/{storeId}/inventory → 400

### IT-B3: 엑셀 다운로드 검증
1. 매장에 item 5종, snapshot 시드
2. GET .../inventory/export → 200, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
3. 워크북 파싱 → 헤더 컬럼 9개, 데이터 행 5개 검증

---

## TASK-D3 | 테스터 — E2E (프론트엔드)

> Playwright 또는 기존 프로젝트의 E2E 도구 사용. 없으면 수동 시나리오로 대체.

### E2E-1: BRAND_ADMIN 본사 창고 신규 발주 시나리오
1. 로그인 → /admin/warehouse-inventory → 창고 자동 선택
2. [+ 발주하기] → 외부 공급사 선택 → 납품일 선택
3. 카테고리 [컵/뚜껑] → "아이스컵 22oz" 100박스 추가
4. [확정] 모달 → 확인
5. /admin/warehouse-inventory/order/{id}로 자동 이동, 상태 CONFIRMED

### E2E-2: 본사 입고 처리
1. /admin/warehouse-inventory/receiving → 대기 발주 1건
2. 클릭 → 라인별 실수량 100, 유통기한 2026-12-31 입력
3. [입고 확정] → 토스트 성공
4. /admin/warehouse-inventory 재고 탭에서 100박스 증가 확인

### E2E-3: 본사 창고 실사
1. /admin/warehouse-inventory → [실사] 탭 → [+ 신규 실사]
2. 카테고리 [컵/뚜껑] → 라인 표시 확인
3. 실제 수량 입력 (시스템 100, 실제 95)
4. [완료] → 차이 -5 표시 → ADJUST 적용 확인

### E2E-4: 매장 재고 뷰
1. /admin/store-inventory
2. 매장 셀렉터에 WAREHOUSE 매장이 없는지 확인
3. Aoyama 선택 → 재고 테이블 로드
4. [엑셀 다운로드] → 파일 다운로드 성공
5. 조정/발주/실사 버튼이 화면에 없는지 확인 (읽기 전용)

### E2E-5: ★회귀 — 매장 발주 → 출고 → 창고 자동 차감 (핵심)
1. 사전: supplier에 internal_warehouse_store_id 매핑
2. 매장 계정으로 로그인 → 발주 생성 → 확정
3. BRAND_ADMIN/FULFILLMENT 계정으로 발주 SHIPPING 처리
4. /admin/warehouse-inventory/{id}/inventory/ledger → SHIP_OUT 신규 1건 확인
5. 재고 탭에서 차감 확인

### E2E-6: ★회귀 — 외부 공급사 매장 발주 (영향 0 확인)
1. supplier internal_warehouse_store_id=NULL
2. 매장 발주 → SHIPPING
3. 검증: 모든 창고 ledger에 SHIP_OUT 0건

---

## TASK-D4 | 테스터 — 최종 빌드/회귀 체크리스트

| 항목 | 명령 | 통과 기준 |
|---|---|---|
| 백엔드 빌드 | `mvn clean package` | BUILD SUCCESS |
| 백엔드 단위 + 통합 | `mvn test -Dtest='*Warehouse*,*StoreInventoryView*'` | 0 failures |
| 백엔드 회귀 | `mvn test` (전체) | 기존 테스트 0건 깨짐 |
| 프론트엔드 빌드 | `npm run build` | 에러 0 |
| 프론트엔드 lint | `npm run lint` | 에러 0 |
| Flyway 검증 | 신규 DB에서 V1 → V47 순차 적용 | 모두 SUCCESS |
| Flyway 검증 | 기존 prod 스냅샷 DB에 V46/V47만 적용 | 모두 SUCCESS, 데이터 손실 0 |
| 기존 InventoryAdminPage 호환 | `/admin/inventory` 직접 접근 | `/admin/store-inventory`로 redirect |
| 기존 매장 발주 흐름 | 외부 공급사로 매장 발주 → SHIPPING | warehouse ledger 0 변동 |

---

# 2. 구현 순서 (의존성 그래프)

```
A2 (DB)
 ├→ A3 (엔티티)
 │   ├→ A4 (서비스 — 도메인 패키지)
 │   │   ├→ A5 (컨트롤러 — Phase A API)
 │   │   ├→ A6 (출고 hook 연결)
 │   │   └→ B2 (Phase B API)
 │   │       └→ C1 (라우트)
 │   │           ├→ C2 (창고 페이지)
 │   │           └→ C3 (매장뷰 페이지)
 │   └→ D1 (단위 테스트 — 서비스 완료 즉시)
 │
 └→ D2 (통합 테스트 — A6 완료 후)
     └→ D3 (E2E — C2/C3 완료 후)
         └→ D4 (최종 회귀)
```

**총 예상 기간** (4명 병렬): 7~10일

---

# 3. Agent Teams 실행 프롬프트

> 아래를 Claude Code 터미널에 그대로 붙여넣어 실행.

```
docs/TASKS_V7.md를 읽고 본사 창고 재고/발주 시스템과 매장 재고 현황 뷰를
에이전트 팀으로 병렬 구현해줘.

프로젝트: /home/ubuntu/coffee-inventory
스택: Spring Boot 3 + JPA + Flyway + MySQL + React 19 + TypeScript + Tailwind + shadcn/ui
API 패턴: ApiResponse<T>, /api/v1/

⭐ 절대 원칙
- 모든 변경은 additive only (DROP/MODIFY/RENAME 금지)
- 기존 도메인 패키지(inventory, ordering, receiving) 파일은 hook 연결 1줄을 제외하고 수정 금지
- 신규 코드는 com.coffee.domain.warehouse 패키지로 격리
- 새 마이그레이션은 V46, V47만. 기존 V1~V45는 절대 수정 금지

=== 4명 팀 구성 ===

■ ARCHITECT (시스템기획) — delegate mode, 코드 직접 작성 X
담당: 전체 설계, 조율, 코드리뷰, 품질관리, 충돌 방지

시작 작업:
1. 프로젝트 구조 파악
   - backend/src/main/java 패키지, 특히 inventory/ordering/receiving/org 도메인
   - frontend/src 라우팅(App.tsx), api/ 폴더, pages/admin/ 폴더
   - V45까지 마이그레이션 스키마 (특히 store, supplier, inventory_snapshot, stock_ledger, order_plan)
2. docs/TASKS_V7.md 정독 후 구현 계획 수립
3. 핵심 hook 위치 식별:
   - "fulfillment_status"가 SHIPPING으로 변경되는 정확한 코드 라인 찾기
   - WarehouseShipmentService.shipFromWarehouse 호출 위치 결정 (단 1곳)
4. FifoStockService(또는 동등 위치)의 정확한 시그니처 확인 후 BACKEND에 전달

각 팀메이트에게 전달할 것:
- BACKEND: 정확한 DDL, 엔티티 필드명, hook 삽입 위치, FIFO 서비스 시그니처
- FRONTEND: 신규 API 엔드포인트 + Request/Response DTO 스펙, 기존 React 패턴
- TESTER: 테스트 시나리오, 회귀 검증 핵심 항목 (외부 supplier 영향 0)

진행 중 작업:
- 각 팀메이트 plan 검토 후 승인/반려
- 완료 코드 리뷰 (additive 위반, 네이밍 일관성, 도메인 격리)
- TASKS_V7.md 체크박스 [x] 업데이트
- Phase 완료 시: git add . && git commit -m "PHASE X: 설명" && git push origin main

■ BACKEND (백엔드) — DB/엔티티/서비스/컨트롤러

작업 순서:
[Phase A — DB & 엔티티]
TASK-A2: V46__warehouse_store_type.sql, V47__seed_default_warehouse.sql 작성
  - mvn flyway:migrate 통과 검증
  - 기존 데이터 SELECT COUNT(*) before/after 동일 확인
TASK-A3: Store/Supplier/LedgerType 확장 (필드 3개 + enum 1개)
  - StoreRepository.findByBrandIdAndStoreTypeAndStatus 추가

[Phase A — 신규 도메인 패키지]
TASK-A4: com.coffee.domain.warehouse 패키지 생성
  - WarehouseService (창고 조회/검증)
  - WarehouseInventoryService (위임 — 신규 비즈 로직 X)
  - WarehouseShipmentService (★핵심 — FIFO 차감 + SHIP_OUT ledger)
  - WarehouseOrderService, WarehouseReceivingService

[Phase A — API]
TASK-A5: 5개 컨트롤러 작성
  - WarehouseInventoryController, WarehouseOrderController
  - WarehouseReceivingController, WarehouseCycleCountController
  - 모든 엔드포인트 @PreAuthorize + brandId 검증

[Phase A — Hook]
TASK-A6: 매장 OrderPlan SHIPPING 전환 지점에 1줄 호출 추가
  - 위치는 ARCHITECT가 정확히 지정
  - InsufficientStockException → HTTP 409 + WAREHOUSE_INSUFFICIENT_STOCK

[Phase B — 매장 뷰 API]
TASK-B2: AdminStoreInventoryController
  - listStores (WAREHOUSE 제외)
  - getInventory (InventoryService 위임)
  - getLastCount, getLedger
  - exportExcel (Apache POI)

규칙:
- ApiResponse<T> 패턴 일관 적용
- 기존 InventoryService/OrderService/DeliveryService 시그니처 변경 절대 금지
- WarehouseShipmentService는 외부 supplier에 대해 반드시 no-op
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현
- 매 TASK 완료 시 ARCHITECT + TESTER에게 알림

■ FRONTEND (프론트엔드) — React 화면

작업 순서:
[Phase C — 라우트]
TASK-C1: App.tsx에 8개 신규 라우트 추가
  - /admin/inventory → /admin/store-inventory 리디렉션
  - 사이드바: [재고] 그룹 안에 [본사 창고 재고], [매장 재고 현황] 메뉴

[Phase C — API 클라이언트]
TASK-C2-1: src/api/warehouse.ts 작성 (모든 warehouse API 메서드)
TASK-C3-1: src/api/adminStoreInventory.ts 작성

[Phase C — 본사 창고 페이지]
TASK-C2-2: 8개 페이지 컴포넌트 작성
  - WarehouseInventoryPage (메인 + 5개 탭)
  - WarehouseOrderNewPage / WarehouseOrderDetailPage
  - WarehouseReceivingPage / WarehouseReceivingDetailPage
  - WarehouseCycleCountListPage / NewPage / DetailPage
  - shadcn/ui (Card, Tabs, Dialog, Select, Calendar, Sheet)
  - react-hook-form + zod 폼 검증

[Phase C — 매장 뷰 페이지]
TASK-C3-2: StoreInventoryViewPage
  - 매장 셀렉터(WAREHOUSE 제외), 요약 카드, 재고 테이블, 탭 3개
  - 엑셀 다운로드 (file-saver)
  - ★조정/발주/실사 버튼 절대 X (읽기 전용)

규칙:
- 기존 InventoryAdminPage.tsx 컴포넌트는 그대로 두고 라우트만 redirect
- 모바일 반응형 (BRAND_ADMIN 데스크탑 위주이지만 깨지지 않게)
- BACKEND API 미완성 시 mock 데이터로 UI 먼저
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현

■ TESTER (테스트) — 단위/통합/E2E

[BACKEND 테스트 — 완료 알림 즉시 작성]
T-A1: V46 마이그레이션 단위 테스트
T-A2: V47 시드 단위 테스트 (멱등성)
T-A3: WarehouseService 단위 테스트
T-A4: ★WarehouseShipmentService 단위 테스트 (FIFO, no-op, 잔량부족)
T-A5: WarehouseInventoryController @WebMvcTest
T-A6: WarehouseOrderController @WebMvcTest
T-A7: WarehouseCycleCountController @WebMvcTest
T-A8: ★회귀 — 외부 공급사 매장 발주 흐름 (영향 0 검증)
T-B1: AdminStoreInventoryController 단위 테스트

[통합 테스트 (E2E 백엔드)]
IT-A1: 본사 발주 → 입고 → 재고 증가 풀 플로우
IT-A2: ★매장 발주 → 본사 출고 → 창고 차감 풀 플로우
IT-A3: 잔량 부족 시 출고 차단 + 트랜잭션 롤백
IT-A4: 본사 창고 실사 → ADJUST 반영
IT-B1: 매장 재고 뷰 다른 brand 차단
IT-B2: 매장 재고 뷰 WAREHOUSE 차단
IT-B3: 엑셀 다운로드 워크북 파싱 검증

[프론트엔드 E2E]
E2E-1~4: 본사 창고 신규 발주/입고/실사/매장뷰
E2E-5: ★매장 발주 → 출고 → 창고 자동 차감 (회귀)
E2E-6: ★외부 공급사 매장 발주 영향 0 (회귀)

[최종 빌드 검증]
T-FINAL-1: mvn clean package (전체)
T-FINAL-2: npm run build
T-FINAL-3: 기존 테스트 0건 깨짐 확인
T-FINAL-4: 기존 prod 스냅샷에 V46/V47만 적용 — 데이터 손실 0 확인

규칙:
- 기존 테스트 패턴(@SpringBootTest, @DataJpaTest, @WebMvcTest) 따르기
- BACKEND 완료 알림 받으면 즉시 해당 테스트 작성
- ★표시된 테스트는 절대 skip 금지 (회귀/핵심)
- 실패 → 해당 팀메이트에게 직접 메시지
- 모든 테스트 통과 후 ARCHITECT에게 보고

=== 작업 흐름 ===

■ Day 1 (분석 & DB):
  ARCHITECT → 프로젝트 분석, hook 위치 식별, FIFO 시그니처 확정
  BACKEND → TASK-A2 (V46/V47), TASK-A3 (엔티티)
  FRONTEND → 기존 React 구조 분석, shadcn 컴포넌트 파악
  TESTER → T-A1, T-A2 (마이그레이션 검증)

■ Day 2-3 (Phase A 백엔드 핵심):
  BACKEND → TASK-A4 (서비스), TASK-A5 (컨트롤러), TASK-A6 (hook)
  FRONTEND → TASK-C1 (라우트), TASK-C2-1 (warehouse API 클라이언트)
  TESTER → T-A3~A8 (서비스/컨트롤러 단위)

■ Day 4-5 (Phase B + 프론트):
  BACKEND → TASK-B2 (매장 뷰 API)
  FRONTEND → TASK-C2-2 (창고 페이지), TASK-C3 (매장뷰 페이지)
  TESTER → T-B1, IT-A1~A4 (백엔드 통합)

■ Day 6-7 (E2E + 최종):
  FRONTEND → 페이지 마무리, 폴리싱
  TESTER → IT-B1~B3, E2E-1~6, T-FINAL
  ARCHITECT → 최종 리뷰 + git push

=== 필수 규칙 ===

1. 파일 충돌 방지: 같은 파일 동시 수정 X. ARCHITECT가 담당 분배
2. 의존성 순서: BACKEND 엔티티 → FRONTEND API 연결 → TESTER 검증
3. FRONTEND는 API 미완성 시 mock으로 먼저
4. ARCHITECT는 delegate mode — 코드 작성 X, 조율/리뷰만
5. 기존 도메인 파일 수정은 ARCHITECT 명시적 승인 필요
6. 매 TASK 완료 시 TASKS_V7.md 체크박스 [x]
7. 빌드 에러 0 확인 후 다음 TASK
8. Phase 완료 시: git add . && git commit -m "PHASE X: 설명" && git push origin main
9. ★표시 테스트(T-A4, T-A8, IT-A2, IT-A3, E2E-5, E2E-6) 통과 없이 production merge 절대 금지
```

---

# 4. 부록 — 자주 묻는 질문

### Q1. 왜 별도 `warehouse` 테이블을 만들지 않나?
A. `Store`의 `store_type='WAREHOUSE'`로 충분합니다. `InventorySnapshot.store_id`, `StockLedger.store_id`, `OrderPlan.store_id`, FIFO/유통기한/실사 인프라를 100% 재사용 가능합니다. 별도 테이블을 만들면 동일 로직을 두 번 구현해야 하고 유지보수 비용이 두 배가 됩니다.

### Q2. 매장이 외부 공급사에 직접 발주하는 기존 흐름은 어떻게 되나?
A. 변동 없습니다. `supplier.internal_warehouse_store_id IS NULL`인 supplier는 `WarehouseShipmentService.shipFromWarehouse`의 첫 줄 가드(`if (!supplier.isInternalSupplier()) return;`)에서 즉시 빠집니다. 회귀 테스트 T-A8/IT 흐름/E2E-6로 명시 검증합니다.

### Q3. 창고가 여러 개일 수 있나?
A. 네. brand당 WAREHOUSE store는 무제한입니다. supplier는 1개 창고에만 매핑됩니다(여러 창고에서 출고하는 케이스는 V8에서 도입 검토).

### Q4. 본사 창고에서 매장으로 직접 "이동" 기능은?
A. V7 범위 외입니다. 현재는 매장 → supplier(=내부 창고 매핑) 발주 → SHIPPING 시 자동 차감으로 처리합니다. 직접 이동 API(/admin/warehouses/{from}/transfer/{toStore})는 V8 후보.

### Q5. WAREHOUSE store에 STORE_MANAGER 권한 사용자를 배정할 수 있나?
A. V7에서는 비권장. WAREHOUSE는 BRAND_ADMIN/KR_INVENTORY/FULFILLMENT만 접근. 사용자 매핑 정책은 별도 제약 추가 검토.

### Q6. Aoyama 파일럿 매장에 영향이 있나?
A. 0. Aoyama는 STORE 타입이고 supplier 매핑이 변경되지 않는 한 모든 발주/입고/재고/실사 흐름이 그대로 동작합니다. V46 마이그레이션 적용 시 Aoyama의 store_type은 자동으로 'STORE' default로 채워집니다.
