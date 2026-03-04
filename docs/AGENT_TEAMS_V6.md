# AGENT_TEAMS_V6.md — V6 ERP 고도화 Agent Teams 작업 지시서

> **선행 조건**: V5.1 Phase 17~24 구현 완료 상태에서 시작
> **목표**: 상품별 배송요일, 마감 고도화(쇼트관리), 다법인 역할 확장, 재무 기능, 엑셀 벌크 업로드
> **사용 주체**: 매장(JP), 브랜드 본사(KR 재고관리), 재무팀(KR), 수주 업체(공급사 포털)

---

## 0. 사전 설정

### settings.json

```json
{
  "skipDangerousModePermissionPrompt": true,
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(**)",
      "Bash(git *)",
      "Bash(mvn *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(cd *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(rm *)",
      "Bash(java *)",
      "Bash(curl *)",
      "Bash(wc *)",
      "Bash(head *)",
      "Bash(tail *)"
    ]
  }
}
```

---

## 1. 실행 프롬프트

아래를 Claude Code 터미널에 그대로 붙여넣기:

```
docs/AGENT_TEAMS_V6.md를 읽고 V6 ERP 고도화를 에이전트 팀으로 병렬 구현해줘.

프로젝트: /home/ubuntu/coffee-inventory
스택: Spring Boot 3 + JPA + Flyway + MySQL + React 18 + Tailwind + shadcn/ui
API 패턴: ApiResponse<T>, /api/v1/
기존 구현: V5.1 Phase 17~24 완료 상태 (발주/입고/클레임/실사/대시보드)

=== 5명 팀 구성 ===

■ ARCHITECT (설계/조율) — delegate mode, 코드 직접 작성 X
■ BACKEND-1 (상품/정책) — 상품 배송요일 + 정책 엔진 수정 + 카탈로그 수정
■ BACKEND-2 (운영/재무) — 마감 고도화 + 역할 확장 + 재무 API + 벌크 업로드
■ FRONTEND (화면) — 전체 프론트엔드
■ TESTER (검증) — 테스트 작성 + 통합 빌드

아래에 각 에이전트의 상세 지시가 있으니 정독 후 실행해줘.

=== 필수 규칙 ===
1. 파일 충돌 방지: BACKEND-1과 BACKEND-2는 서로 다른 파일만 수정. ARCHITECT가 담당 파일 분배.
2. 기존 코드 깨뜨리지 않기. V5.1에서 구현된 발주/입고/클레임 API는 하위호환 유지.
3. Flyway 마이그레이션 버전은 기존 마지막 버전 + 1. 기존 버전 절대 수정 금지.
4. FRONTEND는 API 미완성 시 mock 데이터로 먼저 구현, 나중에 연결.
5. 모든 팀메이트는 작업 전 plan을 ARCHITECT에게 보내고 승인 후 구현.
6. Phase 완료 시: git add . && git commit -m "V6 PHASE XX: 설명" && git push origin main
7. 에러 없이 mvn clean compile && npm run build 확인 후 다음 Phase.
```

---

## 2. 에이전트별 상세 지시

---

### ■ ARCHITECT (설계/조율)

**역할**: delegate mode. 코드 직접 작성하지 않음. 설계·조율·리뷰·승인만.

**시작 작업 (Phase 0)**:

```
1. 프로젝트 현황 파악
   - backend/src/main/resources/db/migration/ → 마지막 Flyway 버전 확인
   - backend/src/main/java/com/coffee/domain/ → 패키지별 엔티티·서비스·컨트롤러 목록
   - frontend/src/pages/ → 라우팅 구조
   - frontend/src/api/ → API 클라이언트 구조
   - frontend/src/locales/ → i18n 키 구조

2. 기존 핵심 코드 분석 (BACKEND에게 전달할 것)
   - DeliveryPolicyService 현재 로직 (getAvailableDates, isItemOrderableForDate)
   - OrderConfirmService.confirmCart() 흐름
   - Item 엔티티 현재 필드
   - users 테이블 role 타입 (ENUM vs VARCHAR)
   - SecurityConfig 현재 권한 체크 방식 (@PreAuthorize 패턴)

3. 파일 담당 분배
   BACKEND-1 전용:
     - 새 Flyway: V{N}__v6_item_delivery_schedule.sql
     - domain/master/ 패키지 (Item, Packaging, ItemDeliverySchedule 엔티티)
     - domain/ordering/ 중 DeliveryPolicyService, CatalogService
   BACKEND-2 전용:
     - 새 Flyway: V{N+1}__v6_cutoff_roles_finance.sql
     - domain/ordering/ 중 OrderCutoffService, OrderShortageService
     - domain/finance/ 패키지 (신규)
     - domain/bulk/ 패키지 (신규)
     - config/SecurityConfig (역할 확장)
   FRONTEND 전용:
     - frontend/src/ 전체
   공유 금지 파일:
     - 같은 Flyway 파일 동시 수정 X
     - 같은 서비스 클래스 동시 수정 X (ARCHITECT가 순서 조율)
```

**진행 중 작업**:
```
- 각 팀메이트의 plan 검토 → 승인 또는 수정 요청
- 완료된 코드 리뷰 (기존 코드 충돌, 네이밍 일관성, 하위호환)
- docs/TASKS_V6.md 체크박스 [x] 업데이트
- Phase 단위 git commit + push
- BACKEND-1과 BACKEND-2 사이 의존성 순서 조율:
  → BACKEND-1의 item_delivery_schedule 스키마가 먼저 완료되어야
    BACKEND-2의 마감 쇼트 체크에서 배송요일 정보 활용 가능
```

---

### ■ BACKEND-1 (상품/정책 담당)

**담당 영역**: 상품 모델 확장 + 배송요일 + 정책 엔진 수정 + 카탈로그 수정

---

#### TASK-080 | Flyway 마이그레이션 — 상품 확장 + 배송요일 스케줄

```sql
-- V{N}__v6_item_delivery_schedule.sql
-- 기존 마지막 Flyway 버전 확인 후 그 다음 번호 사용

-- A. item 테이블 확장
ALTER TABLE item ADD COLUMN item_code VARCHAR(50);          -- ERP 상품코드
ALTER TABLE item ADD COLUMN spec VARCHAR(200);              -- 규격 (500G*12EA/BOX)
ALTER TABLE item ADD COLUMN description TEXT;               -- 상세 설명

-- item_code에 유니크 인덱스 (NULL 허용, 값이 있으면 유니크)
CREATE UNIQUE INDEX uq_item_code ON item(item_code) WHERE item_code IS NOT NULL;
-- MySQL은 WHERE 조건 안 되므로 대안:
ALTER TABLE item ADD UNIQUE INDEX uq_brand_item_code (brand_id, item_code);

-- B. packaging 테이블 확장
ALTER TABLE packaging ADD COLUMN order_unit_name VARCHAR(20) DEFAULT 'BOX';
-- 값: BOX, 내박스, 낱개, EA, 봉, 팩, 캔, 병

-- C. item_category 확장 (기존 테이블에 컬럼 추가)
ALTER TABLE item_category ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE item_category ADD COLUMN IF NOT EXISTS description TEXT;

-- D. 상품별 배송요일 스케줄 (핵심 신규 테이블)
CREATE TABLE item_delivery_schedule (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT NOT NULL,
  brand_id BIGINT NOT NULL,
  mon TINYINT(1) DEFAULT 0,
  tue TINYINT(1) DEFAULT 0,
  wed TINYINT(1) DEFAULT 0,
  thu TINYINT(1) DEFAULT 0,
  fri TINYINT(1) DEFAULT 0,
  sat TINYINT(1) DEFAULT 0,
  sun TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES item(id),
  UNIQUE KEY uq_item_schedule (item_id, brand_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**엔티티**:
```java
// domain/master/entity/ItemDeliverySchedule.java
@Entity @Table(name = "item_delivery_schedule")
public class ItemDeliverySchedule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long itemId;
    private Long brandId;
    private Boolean mon, tue, wed, thu, fri, sat, sun;
    private Boolean isActive;
    private LocalDateTime createdAt, updatedAt;

    // 요일 체크 헬퍼
    public boolean isAvailable(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> Boolean.TRUE.equals(mon);
            case TUESDAY -> Boolean.TRUE.equals(tue);
            case WEDNESDAY -> Boolean.TRUE.equals(wed);
            case THURSDAY -> Boolean.TRUE.equals(thu);
            case FRIDAY -> Boolean.TRUE.equals(fri);
            case SATURDAY -> Boolean.TRUE.equals(sat);
            case SUNDAY -> Boolean.TRUE.equals(sun);
        };
    }

    // "월수금" 같은 표시용 문자열
    public String getDisplayDays() { ... }
}
```

**Repository**:
```java
public interface ItemDeliveryScheduleRepository extends JpaRepository<ItemDeliverySchedule, Long> {
    Optional<ItemDeliverySchedule> findByItemIdAndBrandId(Long itemId, Long brandId);
    List<ItemDeliverySchedule> findByBrandIdAndIsActiveTrue(Long brandId);
    @Query("SELECT ids FROM ItemDeliverySchedule ids WHERE ids.brandId = :brandId AND ids.isActive = true AND ids.:dayColumn = true")
    List<ItemDeliverySchedule> findByBrandIdAndDayOfWeek(@Param("brandId") Long brandId, ...);
}
```

**API (기존 master API 확장)**:
```
POST   /api/v1/master/items/{itemId}/delivery-schedule
GET    /api/v1/master/items/{itemId}/delivery-schedule
PUT    /api/v1/master/items/{itemId}/delivery-schedule
DELETE /api/v1/master/items/{itemId}/delivery-schedule

Request: { "mon": true, "tue": false, "wed": true, "thu": false, "fri": true, "sat": false, "sun": false }
Response: ApiResponse<ItemDeliveryScheduleDto>
```

**Item 엔티티 확장** (기존 필드에 추가):
```java
// 기존 Item 엔티티에 추가
private String itemCode;      // ERP 상품코드
private String spec;           // 규격
private String description;    // 상세 설명
```

**Packaging 엔티티 확장**:
```java
// 기존 Packaging 엔티티에 추가
private String orderUnitName;  // 발주단위 표시명 (BOX, 내박스, 낱개)
```

---

#### TASK-081 | DeliveryPolicyService 수정 — 상품별 배송요일 반영

**핵심 변경**: `isItemOrderableForDate()` 에서 상품별 스케줄 우선 체크

```java
// 기존 로직 (정책 기반만):
// boolean isDeliveryDay = policy.getDeliveryDays().contains(dayOfWeek);

// 변경 로직 (상품별 스케줄 우선, 없으면 정책 fallback):
public boolean isItemOrderableForDate(Long itemId, LocalDate deliveryDate, Long storeId) {
    DayOfWeek dow = deliveryDate.getDayOfWeek();
    
    // 1. 일요일 무조건 불가
    if (dow == DayOfWeek.SUNDAY) return false;
    
    // 2. 공휴일 체크
    if (isHoliday(deliveryDate, brandId)) return false;
    
    // 3. 상품별 배송요일 체크 (우선순위 1)
    Optional<ItemDeliverySchedule> schedule = scheduleRepo.findByItemIdAndBrandId(itemId, brandId);
    if (schedule.isPresent() && schedule.get().getIsActive()) {
        boolean dayMatch = schedule.get().isAvailable(dow);
        if (!dayMatch) return false;
    } else {
        // 4. 상품별 스케줄 없으면 → 정책 기본 배송요일 체크 (fallback)
        DeliveryPolicy policy = getStorePolicy(storeId);
        if (!isDayInPolicy(dow, policy.getDeliveryDays())) return false;
    }
    
    // 5. 리드타임 체크 (기존 로직 유지)
    Item item = itemRepo.findById(itemId).orElseThrow();
    int leadDays = Math.max(item.getLeadTimeDays(), policy.getCutoffLeadDaysBefore());
    LocalDate earliestDate = LocalDate.now().plusDays(leadDays);
    return !deliveryDate.isBefore(earliestDate);
}
```

**getAvailableDates() 변경**: 날짜별 주문 가능 상품 수 포함

```java
public List<AvailableDateDto> getAvailableDates(Long storeId, int maxDays) {
    // 기존 로직 + 각 날짜에 대해 orderable item 수 추가
    List<AvailableDateDto> dates = /* 기존 로직 */;
    for (AvailableDateDto date : dates) {
        long orderableCount = countOrderableItems(storeId, date.getDate());
        date.setOrderableItemCount(orderableCount);
    }
    return dates;
}
```

**delivery-dates API 응답 확장**:
```json
{
  "availableDates": [
    {
      "date": "2026-03-06",
      "dayOfWeek": "FRI",
      "isRecommended": true,
      "orderDeadline": "2026-03-04T09:00:00",
      "orderableItemCount": 18
    }
  ]
}
```

---

#### TASK-082 | 카탈로그 API 수정

**GET /api/v1/ordering/catalog** 변경점:
```
기존: 정책 기반 배송요일로만 필터링
변경: item_delivery_schedule 우선 → 정책 fallback

납품일: 3월 6일(금) 선택 시
→ item_delivery_schedule.fri = 1 인 상품 ✅
→ schedule 없는 상품은 delivery_policy 기준 (MON_WED_FRI → 금요일 포함이면 ✅)
→ schedule.fri = 0 인 상품 ❌ (정책과 무관하게 상품별 스케줄이 우선)
```

**카탈로그 응답에 배송주기 정보 추가**:
```json
{
  "itemId": 1,
  "itemName": "에스프레소 원두 1kg",
  "itemCode": "CF-001",
  "spec": "1kg × 1봉",
  "deliveryDays": "월수금",
  "deliveryDaysDetail": { "mon": true, "wed": true, "fri": true },
  "packagings": [
    {
      "packagingId": 7,
      "label": "1kg × 1봉",
      "orderUnitName": "봉",
      "unitsPerPack": 1.0,
      "unitPrice": 25000
    }
  ]
}
```

---

#### TASK-083 | 상품 마스터 API 확장

**기존 item CRUD에 추가할 필드**:
```
POST /api/v1/master/items — Request에 itemCode, spec, description 추가
PUT  /api/v1/master/items/{id} — 동일

POST /api/v1/master/packagings — Request에 orderUnitName 추가
PUT  /api/v1/master/packagings/{id} — 동일
```

**카테고리 3단계 관리 API 강화**:
```
GET /api/v1/master/categories?brandId={id}&level={1|2|3}&parentId={id}
POST /api/v1/master/categories — { brandId, parentId, name, code, level, displayOrder }
```

---

#### BACKEND-1 규칙
```
- 기존 DeliveryPolicyService 로직을 깨뜨리지 않기: schedule 없으면 기존 동작 그대로
- item_delivery_schedule은 Optional: 등록 안 해도 정상 동작 (fallback)
- 기존 카탈로그 API 응답 형식 유지하고 필드만 추가 (하위호환)
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현
- 매 TASK 완료 시 ARCHITECT + TESTER에게 알림
```

---

### ■ BACKEND-2 (운영/재무 담당)

**담당 영역**: 마감 고도화 + 역할 확장 + 재무 API + 벌크 업로드
**의존성**: BACKEND-1의 TASK-080 (스키마) 완료 후 시작

---

#### TASK-090 | Flyway 마이그레이션 — 마감/역할/재무

```sql
-- V{N+1}__v6_cutoff_roles_finance.sql
-- BACKEND-1 마이그레이션 다음 번호

-- A. order_plan 상태 확장 (CUTOFF_CLOSED 추가)
-- 현재 status 컬럼이 ENUM이면 VARCHAR로 변경 필요
-- 먼저 현재 타입 확인 후 처리
ALTER TABLE order_plan MODIFY COLUMN status VARCHAR(30) DEFAULT 'DRAFT';
-- 가능한 값: DRAFT, CONFIRMED, CUTOFF_CLOSED, DISPATCHED, CANCELLED, RECEIVED, PARTIALLY_RECEIVED

-- B. 감량 이력 테이블
CREATE TABLE order_shortage_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  order_line_id BIGINT NOT NULL,
  original_qty INT NOT NULL,
  adjusted_qty INT NOT NULL,
  shortage_reason VARCHAR(200),
  adjusted_by BIGINT NOT NULL,
  adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notified_at DATETIME,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id),
  FOREIGN KEY (order_line_id) REFERENCES order_line(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- C. users role 확장 (ENUM → VARCHAR)
-- 기존이 ENUM이면:
ALTER TABLE users MODIFY COLUMN role VARCHAR(30) NOT NULL DEFAULT 'STORE_MANAGER';
-- 추가 역할: JP_ORDERER, KR_INVENTORY, KR_FINANCE, FULFILLMENT

-- D. 벌크 업로드 배치 관리
CREATE TABLE bulk_upload_batch (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  upload_type VARCHAR(30) NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  file_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'PENDING',
  total_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  error_details JSON,
  uploaded_by BIGINT NOT NULL,
  confirmed_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- E. 월마감 관리
CREATE TABLE monthly_closing (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  closing_year INT NOT NULL,
  closing_month INT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  total_purchase_amount DECIMAL(15,2) DEFAULT 0,
  total_sales_amount DECIMAL(15,2) DEFAULT 0,
  total_inventory_value DECIMAL(15,2) DEFAULT 0,
  closed_by BIGINT,
  closed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brand_month (brand_id, closing_year, closing_month),
  FOREIGN KEY (brand_id) REFERENCES brand(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- F. 수주 업체 알림 테이블 (공급사가 발주 수신 후 처리상태 알림)
CREATE TABLE supplier_order_notification (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  notification_type VARCHAR(30) NOT NULL,
  -- ORDER_RECEIVED: 발주 수신 확인
  -- SHIPMENT_READY: 출고 준비 완료
  -- SHIPPED: 출고 완료
  -- DELIVERY_ISSUE: 배송 이슈
  message TEXT,
  notified_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### TASK-091 | 마감 고도화 — OrderCutoffService

**새 서비스: `domain/ordering/service/OrderCutoffService.java`**

```java
@Service
public class OrderCutoffService {

    // 1. 마감 실행 (특정 날짜의 CONFIRMED 발주 전체를 CUTOFF_CLOSED로)
    public CutoffResultDto executeCutoff(LocalDate deliveryDate, Long executedBy) {
        List<OrderPlan> targets = orderPlanRepo
            .findByDeliveryDateAndStatus(deliveryDate, "CONFIRMED");
        for (OrderPlan plan : targets) {
            plan.setStatus("CUTOFF_CLOSED");
        }
        return new CutoffResultDto(targets.size(), deliveryDate);
    }

    // 2. 쇼트 체크 (현재고 vs 총 발주량 비교)
    public ShortageCheckResultDto checkShortage(LocalDate deliveryDate, Long brandId) {
        // 해당 납품일의 모든 CUTOFF_CLOSED 발주 라인을 품목별로 집계
        // 각 품목의 현재고(inventory_snapshot)와 비교
        // 부족 품목 + 영향받는 매장 목록 반환
    }

    // 3. 감량 처리 (특정 발주 라인의 수량 조정)
    public void adjustOrderLine(Long orderPlanId, Long orderLineId,
                                 int adjustedQty, String reason, Long adjustedBy) {
        OrderLine line = ...;
        int originalQty = line.getPackQty();
        line.setPackQty(adjustedQty);
        // 금액 재계산
        // shortage_log 기록
        OrderShortageLog log = new OrderShortageLog(
            orderPlanId, orderLineId, originalQty, adjustedQty, reason, adjustedBy
        );
        shortageLogRepo.save(log);
    }

    // 4. 일괄 전송 (CUTOFF_CLOSED → DISPATCHED)
    public int dispatchAll(LocalDate deliveryDate, Long executedBy) {
        List<OrderPlan> plans = orderPlanRepo
            .findByDeliveryDateAndStatus(deliveryDate, "CUTOFF_CLOSED");
        for (OrderPlan plan : plans) {
            plan.setStatus("DISPATCHED");
            plan.setAutoConfirmedAt(LocalDateTime.now());
        }
        return plans.size();
    }
}
```

**API**:
```
POST /api/v1/admin/ordering/cutoff
  Body: { "deliveryDate": "2026-03-06" }
  권한: KR_INVENTORY, BRAND_ADMIN
  Response: { "cutoffCount": 12, "deliveryDate": "2026-03-06" }

GET /api/v1/admin/ordering/shortage-check?deliveryDate=2026-03-06
  권한: KR_INVENTORY, BRAND_ADMIN
  Response:
  {
    "deliveryDate": "2026-03-06",
    "shortageItems": [
      {
        "itemId": 1, "itemName": "에스프레소 원두 1kg", "itemCode": "CF-001",
        "currentStock": 5.0, "totalOrdered": 8.0, "shortageQty": 3.0,
        "unit": "kg",
        "affectedOrders": [
          { "orderPlanId": 10, "storeId": 1, "storeName": "강남역점", "orderedPackQty": 5, "lineId": 20 },
          { "orderPlanId": 11, "storeId": 2, "storeName": "홍대점", "orderedPackQty": 3, "lineId": 25 }
        ]
      }
    ],
    "noShortageItems": 15
  }

PUT /api/v1/admin/ordering/plans/{planId}/lines/{lineId}/adjust
  Body: { "adjustedQty": 3, "reason": "재고부족 2팩 감량" }
  권한: KR_INVENTORY, BRAND_ADMIN

POST /api/v1/admin/ordering/dispatch-all
  Body: { "deliveryDate": "2026-03-06" }
  권한: KR_INVENTORY, BRAND_ADMIN
  Response: { "dispatchedCount": 12, "hasUnresolvedShortage": false }
```

---

#### TASK-092 | 역할 기반 접근 제어 확장

**SecurityConfig 수정**:
```java
// 기존 3역할 → 7역할로 확장
// 역할 계층:
// SUPER_ADMIN > BRAND_ADMIN > KR_INVENTORY, KR_FINANCE, JP_ORDERER, FULFILLMENT > STORE_MANAGER

@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_INVENTORY')")
// 마감/쇼트 API

@PreAuthorize("hasAnyRole('BRAND_ADMIN','KR_FINANCE')")
// 재무 API

@PreAuthorize("hasAnyRole('BRAND_ADMIN','JP_ORDERER','STORE_MANAGER')")
// 발주 생성 API

@PreAuthorize("hasAnyRole('BRAND_ADMIN','FULFILLMENT','KR_INVENTORY')")
// 풀필먼트 API
```

**AuthController / UserService 변경**:
```
- JWT 토큰에 role 클레임 포함 (기존 구조 유지)
- /api/v1/auth/me 응답에 역할별 허용 메뉴 목록 추가
```

---

#### TASK-093 | 수주 업체 알림 API (공급사 포털)

**공급사가 발주를 받은 후 처리 상태를 알리는 기능**:

```
GET /api/v1/supplier-portal/orders?supplierId={id}&status={status}
  → 공급사별 수주 목록 (DISPATCHED 상태인 것)
  권한: FULFILLMENT

POST /api/v1/supplier-portal/orders/{orderPlanId}/notify
  Body: {
    "notificationType": "SHIPMENT_READY",  // ORDER_RECEIVED, SHIPMENT_READY, SHIPPED, DELIVERY_ISSUE
    "message": "3월 6일 오전 출고 예정",
    "estimatedDeliveryAt": "2026-03-06T10:00:00"
  }
  권한: FULFILLMENT
  → supplier_order_notification 기록
  → order_plan.fulfillment_status 자동 업데이트:
    ORDER_RECEIVED → PREPARING
    SHIPMENT_READY → PREPARING
    SHIPPED → SHIPPING
    DELIVERY_ISSUE → (상태 유지, 알림만)

GET /api/v1/supplier-portal/orders/{orderPlanId}/notifications
  → 해당 발주의 알림 이력

GET /api/v1/admin/ordering/plans/{id}/supplier-notifications
  → 본사에서 특정 발주의 공급사 알림 확인
  권한: KR_INVENTORY, BRAND_ADMIN
```

---

#### TASK-094 | 재무 대시보드 API (KR_FINANCE)

**새 패키지: `domain/finance/`**

```
GET /api/v1/finance/purchase-summary?brandId={id}&year=2026&month=3
  - 공급사별 매입 합계 (order_plan RECEIVED/PARTIALLY_RECEIVED + delivery COMPLETED)
  - 품목별 매입 합계
  - 전월 대비 증감률
  권한: KR_FINANCE, BRAND_ADMIN

GET /api/v1/finance/inventory-valuation?brandId={id}&date=2026-03-31
  - 매장별/품목별 재고자산 평가
  - 평가 기준: 최종 매입가(supplier_item.price × inventory_snapshot.qty)
  - 총 재고자산 금액
  권한: KR_FINANCE, BRAND_ADMIN

GET /api/v1/finance/monthly-report?brandId={id}&year=2026&month=3
  - 기초재고, 당월매입, 당월출고(판매+폐기), 기말재고 (금액 기준)
  - 매장별 명세
  - 데이터 소스: stock_ledger 집계 (RECEIVE → 매입, SELL+WASTE → 출고)
  권한: KR_FINANCE, BRAND_ADMIN

POST /api/v1/finance/monthly-closing
  Body: { "brandId": 1, "year": 2026, "month": 3 }
  - monthly_closing 레코드 생성 (status=CLOSED)
  - 해당 월 stock_ledger 수정 불가 (비즈니스 로직에서 체크)
  권한: KR_FINANCE, BRAND_ADMIN
```

---

#### TASK-095 | 엑셀 벌크 업로드 API

**새 패키지: `domain/bulk/`**
**의존성**: Apache POI (pom.xml에 추가)

```xml
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi-ooxml</artifactId>
  <version>5.2.5</version>
</dependency>
```

**API**:
```
GET /api/v1/admin/bulk/template?type=ITEM_MASTER
  → 엑셀 템플릿 파일 다운로드 (.xlsx)
  → 각 시트에 컬럼 헤더 + 예제 데이터 1행 + 드롭다운(카테고리, 온도대)
  유형별 템플릿:
    ITEM_MASTER: 상품코드|상품명|대분류|중분류|소분류|기본단위|규격|포장명|포장수량|발주단위|바코드|공급사|공급가|배송요일(월~토)|리드타임|최대주문수량|온도대
    INVENTORY_INIT: 매장명|상품코드|현재수량(낱개)|유통기한|LOT번호
    PURCHASE_IMPORT: 매입일|거래처|상품코드|품목명|규격|입수량|수량|공급가|부가세|입고일

POST /api/v1/admin/bulk/upload
  Content-Type: multipart/form-data
  Params: type=ITEM_MASTER
  → 파싱 + 행별 검증 → batch 생성 (status=VALIDATED)
  → Response: { batchId, totalRows, validRows, errorRows, errors: [{row, column, message}] }

GET /api/v1/admin/bulk/{batchId}/preview
  → 검증 완료 데이터 미리보기 (첫 50행)

POST /api/v1/admin/bulk/{batchId}/confirm
  → 실제 DB INSERT (트랜잭션)
  → batch status = CONFIRMED
  → 에러 발생 시 전체 롤백

GET /api/v1/admin/bulk/history
  → 업로드 이력
```

**서비스 구조**:
```java
@Service
public class BulkUploadService {
    // 유형별 파서 전략 패턴
    Map<String, BulkParser> parsers = Map.of(
        "ITEM_MASTER", new ItemMasterParser(),
        "INVENTORY_INIT", new InventoryInitParser(),
        "PURCHASE_IMPORT", new PurchaseImportParser()
    );
    
    public BulkUploadBatch upload(MultipartFile file, String type, Long userId) { ... }
    public void confirm(Long batchId, Long userId) { ... }
}
```

---

#### BACKEND-2 규칙
```
- BACKEND-1의 스키마 마이그레이션보다 뒤 번호 사용
- order_plan.status를 ENUM에서 VARCHAR로 변환 시 기존 데이터 안전하게 마이그레이션
- users.role도 ENUM→VARCHAR 변환 시 기존 데이터 보존
- 재무 집계는 stock_ledger 기반. 별도 집계 테이블은 캐시 목적만
- 벌크 업로드 확정(confirm)은 반드시 단일 트랜잭션. 실패 시 전체 롤백
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현
- 매 TASK 완료 시 ARCHITECT + TESTER에게 알림
```

---

### ■ FRONTEND (화면 담당)

**담당**: 모든 프론트엔드 화면. 기존 React 구조/라우팅/컴포넌트 패턴 따르기.

---

#### TASK-100 | 상품 등록/수정 화면 개편

**파일**: `/admin/items` 관련 페이지

변경사항:
```
1. 기존 필드에 추가:
   - 상품코드 (item_code) 입력란
   - 규격 (spec) 입력란  
   - 상세 설명 (description) 텍스트에리어

2. 분류 선택 UI 개선:
   - 대분류 → 중분류 → 소분류 cascading 드롭다운
   - 대분류 선택 → 해당 하위 중분류만 표시
   - 중분류 선택 → 해당 하위 소분류만 표시

3. 배송요일 선택 섹션 (신규):
   ┌─────────────────────────────────────────────┐
   │ 📦 배송 설정                                 │
   │                                              │
   │ ○ 정책 기본값 따름 (현재: 월/수/금)           │
   │ ● 상품별 배송요일 지정:                       │
   │   [✅월] [❌화] [✅수] [❌목] [✅금] [❌토]    │
   │                                              │
   │ [매일 배송] 토글 → 월~토 전체 선택            │
   │                                              │
   │ 리드타임: [2] 일  최대주문수량: [50] 개       │
   └─────────────────────────────────────────────┘

4. 포장단위 섹션에 발주단위명(orderUnitName) 드롭다운 추가:
   BOX | 내박스 | 낱개 | EA | 봉 | 팩 | 캔 | 병 | 직접입력
```

---

#### TASK-101 | 발주 화면 카탈로그 수정

**파일**: `/store/ordering/new` (Step 2: 상품 선택)

변경사항:
```
1. 각 상품 카드에 배송주기 뱃지 추가:
   ┌─────────────────────────────────────────┐
   │ 🏷 에스프레소 원두 1kg     [월수금] ← 뱃지│
   │ CF-001 | 봉 | ₩25,000                  │
   │ 재고: 2.5kg | 소진: 2일 후              │
   │ AI 추천: 3봉          [−] [3] [+]       │
   └─────────────────────────────────────────┘

2. 배송요일 뱃지 색상:
   - 매일: 초록 (bg-green-100 text-green-800)
   - 월수금: 파랑 (bg-blue-100 text-blue-800)
   - 화목: 보라 (bg-purple-100 text-purple-800)
   - 기타: 회색

3. 상품이 현재 납품일에 불가한 경우 카탈로그에서 제외 (API에서 필터링됨)

4. 발주단위 표시: "3봉" / "2BOX" / "1내박스" (packaging.orderUnitName 사용)
```

---

#### TASK-102 | 본사 마감 관리 화면 (신규)

**라우트**: `/admin/ordering/cutoff`
**권한**: KR_INVENTORY, BRAND_ADMIN

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 발주 마감 관리                               2026-03-04  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 납품일 선택: [◀ 3/4] [3/5] [3/6 (금)] [3/7] [▶]            │
│                                                              │
│ ┌─ 3/6 (금) 납품 현황 ──────────────────────────────────┐   │
│ │ 접수 매장: 8개  |  총 발주 품목: 45건  |  총 금액: ₩2.3M│   │
│ │ 상태: 🟡 마감 전 (마감시간: 오늘 15:00)                │   │
│ │                                                        │   │
│ │                          [🔒 마감 실행]                 │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ (마감 후 표시)                                               │
│ ┌─ 쇼트 점검 결과 ──────────────────────────────────────┐   │
│ │ 🔴 부족 품목: 3건                                     │   │
│ │                                                        │   │
│ │ ┌───────────┬──────┬───────┬──────┬──────────────┐    │   │
│ │ │ 품목       │ 현재고│ 총발주 │ 부족  │ 조치          │    │   │
│ │ ├───────────┼──────┼───────┼──────┼──────────────┤    │   │
│ │ │ 에스프레소  │ 5kg  │ 8kg   │ 3kg  │ [감량 처리]    │    │   │
│ │ │ 우유 1L    │ 10ea │ 15ea  │ 5ea  │ [감량 처리]    │    │   │
│ │ │ 바닐라시럽  │ 2L   │ 4L    │ 2L   │ [감량 처리]    │    │   │
│ │ └───────────┴──────┴───────┴──────┴──────────────┘    │   │
│ │                                                        │   │
│ │ ✅ 정상 품목: 42건 (쇼트 없음)                         │   │
│ │                                                        │   │
│ │                       [📤 전체 전송 (공급사에 발주)]     │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ (감량 처리 모달)                                             │
│ ┌─ 에스프레소 원두 감량 처리 ────────────────────────────┐   │
│ │ 현재고: 5kg | 총 발주: 8kg | 부족: 3kg                │   │
│ │                                                        │   │
│ │ ┌──────────┬──────────┬──────────┬──────────────┐     │   │
│ │ │ 매장      │ 발주수량  │ 조정수량  │ 감량          │     │   │
│ │ ├──────────┼──────────┼──────────┼──────────────┤     │   │
│ │ │ 강남역점  │ 5봉      │ [3 ▼]   │ -2봉          │     │   │
│ │ │ 홍대점    │ 3봉      │ [2 ▼]   │ -1봉          │     │   │
│ │ └──────────┴──────────┴──────────┴──────────────┘     │   │
│ │ 감량 사유: [재고부족          ▼]                       │   │
│ │                                                        │   │
│ │        [취소]                        [감량 확정]        │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

#### TASK-103 | 본사 발주 달력 뷰 (신규)

**라우트**: `/admin/ordering/calendar`
**권한**: KR_INVENTORY, BRAND_ADMIN

```
┌──────────────────────────────────────────────────────────────┐
│ 📅 발주 현황 달력                    ◀ 2026년 3월 ▶         │
├──────────────────────────────────────────────────────────────┤
│  월      화      수      목      금      토      일         │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐         │
│ │      │      │      │      │      │      │  1   │         │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤         │
│ │  2   │  3   │  4   │  5   │  6   │  7   │  8   │         │
│ │🟢8건 │      │🟡12건│      │🔴15건│      │      │         │
│ │₩1.2M │      │₩2.1M │      │₩2.8M │      │      │         │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤         │
│ │  9   │ 10   │ 11   │ 12   │ 13   │ 14   │ 15   │         │
│ │⬜예정 │      │⬜예정 │      │⬜예정 │      │      │         │
│ └──────┴──────┴──────┴──────┴──────┴──────┴──────┘         │
│                                                              │
│ 범례: 🟢전송완료 🟡마감전 🔴쇼트있음 ⬜발주예정              │
│                                                              │
│ ── 3/6 (금) 상세 ──────────────────────────────────────     │
│ ┌────────────┬────────┬──────────┬──────────────────┐      │
│ │ 매장        │ 품목수  │ 금액      │ 상태             │      │
│ ├────────────┼────────┼──────────┼──────────────────┤      │
│ │ 강남역점    │ 12건   │ ₩450,000 │ 🟢 전송완료      │      │
│ │ 홍대점      │ 8건    │ ₩320,000 │ 🟡 마감대기      │      │
│ │ 신촌점      │ 15건   │ ₩680,000 │ 🔴 쇼트 2건     │      │
│ └────────────┴────────┴──────────┴──────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**구현 포인트**:
```
- shadcn/ui Calendar 기반
- 각 날짜 셀에 발주 건수 + 총 금액 표시
- 날짜 클릭 → 하단에 매장별 상세 표시
- 색상으로 상태 구분 (전송완료/마감전/쇼트/예정)
- 매장별 행 클릭 → /admin/ordering/plans/{id} 상세로 이동
```

---

#### TASK-104 | 수주 업체 포털 화면 (신규)

**라우트**: `/supplier-portal/*`
**권한**: FULFILLMENT

```
/supplier-portal/orders — 수주 목록
  - 상태별 탭: 전체 | 신규접수 | 출고준비 | 출고완료
  - 각 발주 카드: 발주번호, 매장명, 납품일, 품목수, 금액

/supplier-portal/orders/{id} — 수주 상세
  - 품목 리스트 (품목명, 규격, 수량, 금액)
  - 알림 보내기 버튼:
    [📩 수신확인] [📦 출고준비완료] [🚚 출고완료] [⚠️ 이슈알림]
  - 알림 이력 타임라인

/supplier-portal/orders/{id}/notify — 알림 전송 모달
  유형 선택 → 메시지 입력 → 예상 배송시간 (선택) → 전송
```

---

#### TASK-105 | 재무 대시보드 화면 (신규)

**라우트**: `/admin/finance/*`
**권한**: KR_FINANCE, BRAND_ADMIN

```
/admin/finance/dashboard
  - 월별 매입/출고/재고자산 추이 차트 (recharts LineChart)
  - 이번 달 요약 카드 3개: 총 매입액 | 총 출고액 | 기말재고 평가액
  - 공급사별 매입 비중 파이차트

/admin/finance/purchase
  - 기간 선택 (월/분기/연)
  - 공급사별 매입 명세 테이블 (공급사, 품목수, 매입액, 부가세, 합계)
  - 품목별 매입 명세 테이블 (품목, 수량, 단가, 합계)
  - 엑셀 다운로드 버튼

/admin/finance/inventory-value
  - 기준일 선택
  - 매장별 재고자산 테이블 (매장, 품목수, 평가금액)
  - 품목별 상세 (클릭 시 펼침)

/admin/finance/closing
  - 월별 마감 현황 리스트
  - [월마감 실행] 버튼 → 확인 모달 → 확정
  - 마감 완료 월은 수정 불가 표시
```

---

#### TASK-106 | 엑셀 벌크 업로드 화면 (신규)

**라우트**: `/admin/bulk-upload`
**권한**: KR_INVENTORY, BRAND_ADMIN

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 데이터 일괄 업로드                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. 업로드 유형 선택:                                         │
│    (●) 상품 마스터  ( ) 재고 초기화  ( ) 매입 데이터         │
│                                                              │
│ 2. 템플릿 다운로드:                                          │
│    [📥 상품 마스터 템플릿 다운로드 (.xlsx)]                    │
│                                                              │
│ 3. 파일 업로드:                                              │
│    ┌────────────────────────────────────────────┐            │
│    │                                            │            │
│    │    📁 파일을 드래그하거나 클릭하여 선택     │            │
│    │       (.xlsx 파일, 최대 10MB)              │            │
│    │                                            │            │
│    └────────────────────────────────────────────┘            │
│                                                              │
│ (업로드 후 검증 결과)                                        │
│ ┌─ 검증 결과 ─────────────────────────────────────────┐     │
│ │ 전체: 150행 | ✅ 성공: 148행 | ❌ 실패: 2행          │     │
│ │                                                      │     │
│ │ 실패 항목:                                           │     │
│ │ 행 45: [상품코드] "이미 존재하는 상품코드입니다"      │     │
│ │ 행 89: [공급가] "숫자가 아닙니다"                     │     │
│ │                                                      │     │
│ │ 미리보기 (첫 10행):                                  │     │
│ │ ┌─────┬──────────┬──────┬──────┬────────┐           │     │
│ │ │ 행  │ 상품코드  │ 상품명│ 분류  │ 상태    │           │     │
│ │ ├─────┼──────────┼──────┼──────┼────────┤           │     │
│ │ │ 1   │ CF-001   │ 원두 │ 원두  │ ✅ 정상 │           │     │
│ │ │ 2   │ ML-001   │ 우유 │ 유제품│ ✅ 정상 │           │     │
│ │ └─────┴──────────┴──────┴──────┴────────┘           │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                              │
│              [취소]                 [✅ 148건 확정 등록]       │
└──────────────────────────────────────────────────────────────┘
```

---

#### TASK-107 | 역할별 메뉴/라우트 분기

```javascript
// 역할별 메뉴 구조
const menuByRole = {
  JP_ORDERER: [
    { path: '/store/ordering', label: '발주', icon: ShoppingCart },
    { path: '/store/ordering/history', label: '주문현황', icon: ClipboardList },
    { path: '/store/receiving', label: '입고', icon: Package },
    { path: '/store/inventory', label: '재고 조회', icon: BarChart },
    { path: '/store/dashboard', label: '대시보드', icon: Home },
  ],
  KR_INVENTORY: [
    { path: '/admin/ordering/calendar', label: '발주 달력', icon: Calendar },
    { path: '/admin/ordering/cutoff', label: '마감 관리', icon: Lock },
    { path: '/admin/ordering/plans', label: '발주 현황', icon: ClipboardList },
    { path: '/admin/inventory', label: '전체 재고', icon: BarChart },
    { path: '/admin/bulk-upload', label: '일괄 업로드', icon: Upload },
    { path: '/admin/master', label: '마스터 관리', icon: Settings },
  ],
  KR_FINANCE: [
    { path: '/admin/finance/dashboard', label: '재무 대시보드', icon: DollarSign },
    { path: '/admin/finance/purchase', label: '매입 관리', icon: FileText },
    { path: '/admin/finance/inventory-value', label: '재고자산', icon: Database },
    { path: '/admin/finance/closing', label: '월마감', icon: Lock },
  ],
  FULFILLMENT: [
    { path: '/supplier-portal/orders', label: '수주 목록', icon: ShoppingBag },
  ],
  BRAND_ADMIN: [ /* 전체 메뉴 접근 */ ],
  STORE_MANAGER: [ /* 기존 매장 메뉴 */ ],
};
```

**i18n 추가 (ko.json, ja.json)**:
```
마감 관리, 쇼트, 감량, 수주, 재무, 매입, 재고자산, 월마감, 벌크 업로드, 템플릿
관련 번역 키 추가
```

---

#### FRONTEND 규칙
```
- 기존 React 구조/라우팅/컴포넌트 패턴 먼저 파악하고 따르기
- Tailwind + shadcn/ui (Card, Badge, Calendar, Dialog, Sheet, Tabs, Table)
- 모바일 퍼스트 (터치 타겟 48px+)
- BACKEND API가 아직 없으면 mock 데이터로 UI 먼저 구현, 나중에 연결
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현
- 매 TASK 완료 시 ARCHITECT에게 알림
- i18n: 모든 텍스트는 ko.json/ja.json 키로. 하드코딩 금지
```

---

### ■ TESTER (검증 담당)

**담당**: BACKEND-1/BACKEND-2/FRONTEND 완료분 즉시 테스트

---

#### BACKEND-1 테스트

```
T-20: TASK-080 마이그레이션 검증
  - Flyway 정상 적용 (mvn clean compile 성공)
  - 기존 데이터 손상 없음 확인
  - item_delivery_schedule 테이블 생성 확인

T-21: TASK-081 DeliveryPolicyService 단위 테스트
  - 상품에 schedule 있는 경우: schedule 기반 요일 체크
  - 상품에 schedule 없는 경우: delivery_policy fallback
  - schedule.fri=0 + 정책=MON_WED_FRI → 금요일 불가 (상품 스케줄 우선)
  - schedule.tue=1 + 정책=MON_WED_FRI → 화요일 가능 (상품 스케줄 우선)
  - 일요일 무조건 불가
  - 공휴일 제외 (기존 로직 유지 확인)
  - 리드타임 체크 (기존 로직 유지 확인)

T-22: TASK-082 카탈로그 필터링 테스트
  - 금요일 납품 → fri=1인 상품만 반환
  - schedule 없는 상품은 정책 기반 포함/제외
  - 응답에 deliveryDays, spec, orderUnitName 포함 확인

T-23: TASK-083 상품 마스터 확장 테스트
  - item 생성 시 itemCode, spec 저장 확인
  - packaging 생성 시 orderUnitName 저장 확인
  - itemCode 유니크 제약 확인 (중복 시 에러)
```

#### BACKEND-2 테스트

```
T-24: TASK-090 마이그레이션 검증
  - order_plan.status VARCHAR 변환 정상 확인
  - users.role VARCHAR 변환 정상 확인
  - 기존 데이터 값 보존 확인

T-25: TASK-091 마감 고도화 통합 테스트
  - 마감 실행: CONFIRMED 8건 → CUTOFF_CLOSED 8건
  - 쇼트 체크: 현재고 5 < 총발주 8 → shortage 3 반환
  - 감량: 5봉 → 3봉 조정, shortage_log 기록 확인
  - 일괄 전송: CUTOFF_CLOSED → DISPATCHED, 미처리 쇼트 경고
  - 감량 후 금액 재계산 확인

T-26: TASK-092 역할 접근 제어 테스트
  - JP_ORDERER: 발주 생성 ✅, 마감 실행 ❌ (403)
  - KR_INVENTORY: 마감 실행 ✅, 재무 조회 ❌ (403)
  - KR_FINANCE: 재무 조회 ✅, 발주 생성 ❌ (403)
  - BRAND_ADMIN: 전체 ✅
  - STORE_MANAGER: 자기 매장만 ✅

T-27: TASK-093 수주 알림 테스트
  - 알림 전송 → notification 저장
  - SHIPPED → fulfillment_status=SHIPPING 자동 변경
  - 알림 이력 조회

T-28: TASK-094 재무 API 테스트
  - 매입 요약: stock_ledger RECEIVE 기반 집계 정확도
  - 재고 평가: snapshot × price 계산 정확도
  - 월마감: 마감 후 해당 월 수정 불가 확인

T-29: TASK-095 벌크 업로드 테스트
  - 템플릿 다운로드 (xlsx 형식)
  - 정상 데이터 업로드 → 검증 통과 → 확정 → DB 반영
  - 에러 데이터 업로드 → 행별 에러 반환
  - 확정 시 에러 발생 → 전체 롤백 확인
  - 대용량 (500행) 업로드 성능 확인 (<10초)
```

#### 프론트엔드 테스트

```
T-30: 상품 등록 + 배송요일 E2E
  - 상품 등록 → 배송요일 월수금 선택 → 저장 → 조회 시 반영 확인

T-31: 발주 카탈로그 배송요일 필터링
  - 금요일 납품일 선택 → fri=1인 상품만 표시 확인
  - 납품일 변경 시 상품 목록 갱신 확인

T-32: 마감 관리 화면 E2E
  - 마감 → 쇼트 확인 → 감량 → 전송 전체 흐름

T-33: 달력 뷰 데이터 바인딩

T-34: 수주 포털 알림 E2E

T-35: 재무 대시보드 데이터 표시

T-36: 벌크 업로드 파일 선택 → 검증 → 확정
```

#### 최종 빌드 검증

```
T-37: mvn clean package -DskipTests=false (백엔드 전체)
T-38: npm run build (프론트엔드 전체)
T-39: 기존 V5.1 테스트 깨짐 여부 확인
T-40: 기존 발주 플로우 (카트→확정→입고) 리그레션 테스트
```

---

## 3. 작업 흐름 (의존성 + 병렬)

```
Phase 0 — 분석 (모든 에이전트)
  ARCHITECT:  프로젝트 구조 분석, 파일 담당 분배, Flyway 버전 확인
  BACKEND-1:  기존 DeliveryPolicyService + Item 엔티티 코드 분석
  BACKEND-2:  기존 OrderConfirmService + SecurityConfig + users 테이블 분석
  FRONTEND:   기존 React 구조 + 라우팅 + API 클라이언트 분석
  TESTER:     기존 테스트 구조 분석

Phase 1 — 스키마 (BACKEND-1 ∥ BACKEND-2, FRONTEND 시작)
  ┌─ BACKEND-1: TASK-080 (item 확장 + 배송요일 스키마)
  │  BACKEND-2: TASK-090 (마감/역할/재무 스키마) — 080과 동시 가능 (별도 Flyway 파일)
  │  FRONTEND:  TASK-100 (상품 등록 UI 개편 — mock 데이터)
  └─ TESTER:    T-20, T-24 (마이그레이션 검증)

Phase 2 — 핵심 로직 (BACKEND-1 → FRONTEND 연동)
  ┌─ BACKEND-1: TASK-081 (정책 엔진 수정) → TASK-082 (카탈로그 수정) → TASK-083 (마스터 API)
  │  BACKEND-2: TASK-091 (마감 서비스) → TASK-092 (역할 확장)
  │  FRONTEND:  TASK-101 (카탈로그 UI 수정) → TASK-102 (마감 화면) → TASK-103 (달력 뷰)
  └─ TESTER:    T-21~T-23, T-25~T-26 (완료분 즉시)

Phase 3 — 확장 기능 (BACKEND-2 ∥ FRONTEND)
  ┌─ BACKEND-2: TASK-093 (수주 알림) → TASK-094 (재무 API) → TASK-095 (벌크 업로드)
  │  FRONTEND:  TASK-104 (수주 포털) → TASK-105 (재무 대시보드) → TASK-106 (벌크 업로드 UI)
  └─ TESTER:    T-27~T-29, T-30~T-36 (완료분 즉시)

Phase 4 — 통합 + 메뉴 분기 + 최종 검증
  ┌─ FRONTEND:  TASK-107 (역할별 메뉴/라우트)
  │  TESTER:    T-37~T-40 (전체 빌드 + 리그레션)
  └─ ARCHITECT: 최종 리뷰 → git push

■ 병렬 조합 요약:
  Phase 1: BACKEND-1 ∥ BACKEND-2 ∥ FRONTEND(mock)
  Phase 2: BACKEND-1 ∥ BACKEND-2 ∥ FRONTEND(API 연결 시작)
  Phase 3: BACKEND-2 ∥ FRONTEND
  Phase 4: FRONTEND + TESTER
```

---

## 4. 체크박스 (ARCHITECT가 업데이트)

### Phase 1: 스키마
- [ ] TASK-080 | item 확장 + 배송요일 스키마 (BACKEND-1)
- [ ] TASK-090 | 마감/역할/재무 스키마 (BACKEND-2)
- [ ] TASK-100 | 상품 등록 UI 개편 (FRONTEND)
- [ ] T-20, T-24 | 마이그레이션 검증 (TESTER)

### Phase 2: 핵심 로직
- [ ] TASK-081 | DeliveryPolicyService 배송요일 반영 (BACKEND-1)
- [ ] TASK-082 | 카탈로그 배송요일 필터링 (BACKEND-1)
- [ ] TASK-083 | 상품 마스터 API 확장 (BACKEND-1)
- [ ] TASK-091 | 마감 고도화 OrderCutoffService (BACKEND-2)
- [ ] TASK-092 | 역할 기반 접근 제어 (BACKEND-2)
- [ ] TASK-101 | 발주 카탈로그 UI 수정 (FRONTEND)
- [ ] TASK-102 | 본사 마감 관리 화면 (FRONTEND)
- [ ] TASK-103 | 본사 발주 달력 뷰 (FRONTEND)
- [ ] T-21~T-23, T-25~T-26 | 핵심 로직 테스트 (TESTER)

### Phase 3: 확장 기능
- [ ] TASK-093 | 수주 업체 알림 API (BACKEND-2)
- [ ] TASK-094 | 재무 대시보드 API (BACKEND-2)
- [ ] TASK-095 | 엑셀 벌크 업로드 API (BACKEND-2)
- [ ] TASK-104 | 수주 업체 포털 화면 (FRONTEND)
- [ ] TASK-105 | 재무 대시보드 화면 (FRONTEND)
- [ ] TASK-106 | 엑셀 벌크 업로드 화면 (FRONTEND)
- [ ] T-27~T-29, T-30~T-36 | 확장 기능 테스트 (TESTER)

### Phase 4: 통합
- [ ] TASK-107 | 역할별 메뉴/라우트 분기 (FRONTEND)
- [ ] T-37~T-40 | 최종 빌드 + 리그레션 (TESTER)

---

## 5. 핵심 규칙 (전 에이전트 공통)

```
1.  기존 V5.1 API 하위호환 유지. 기존 동작 깨뜨리면 즉시 롤백.
2.  상품별 배송요일은 item_delivery_schedule 테이블 기반. 하드코딩 금지.
3.  schedule 없으면 delivery_policy fallback. null-safe 필수.
4.  발주 단위 = packaging.pack_qty (묶음). 재고 단위 = item.base_unit (낱개). 이중 단위 유지.
5.  마감 흐름: CONFIRMED → CUTOFF_CLOSED → (쇼트 점검/감량) → DISPATCHED. 단계 생략 금지.
6.  역할 체크: 백엔드 @PreAuthorize + 프론트 역할별 라우트. 둘 다 구현.
7.  벌크 업로드: 검증→미리보기→확정 3단계. 바로 INSERT 금지.
8.  모든 감량/조정은 order_shortage_log에 기록. 감사추적 필수.
9.  재무 집계는 stock_ledger 기반. 별도 집계 테이블은 캐시용.
10. i18n: 모든 UI 텍스트 ko.json/ja.json. 하드코딩 금지.
11. 파일 충돌 방지: ARCHITECT가 분배한 파일만 수정.
12. Phase 완료 시: git add . && git commit && git push.
```

---

## 6. 토큰 / 트러블슈팅

| 항목 | 참고 |
|------|------|
| 5명 팀 | 단일 세션 대비 5~8배 토큰 |
| 권장 | Max 20× 이상. Phase 단위로 끊어서 실행 가능 |
| Phase 단위 실행 | "Phase 1만 먼저 실행해줘" → 완료 후 "Phase 2 시작해줘" |

| 증상 | 해결 |
|------|------|
| Flyway 충돌 | BACKEND-1/2 마이그레이션 버전 번호 ARCHITECT가 재확인 |
| ENUM→VARCHAR 실패 | 기존 데이터 백업 후 ALTER. 값이 변하지 않는지 확인 |
| 역할 403 에러 | SecurityConfig에 새 역할 추가 확인, JWT role 클레임 확인 |
| 기존 테스트 깨짐 | TESTER가 원인 파악 → 해당 BACKEND에게 피드백 |
| FRONTEND API 없음 | mock 데이터로 UI 먼저. 나중에 연결 |
| 토큰 한도 | Phase 단위 끊어서 실행 |
