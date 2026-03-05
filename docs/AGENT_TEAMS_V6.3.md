# AGENT_TEAMS_V6.3.md — 납품일 체계 수정 + 매장 관리 + 카탈로그 UX

> **선행 조건**: V6 완료 상태
> **목표 3가지**:
>   1. 납품일 체계 전면 수정 (일요일/공휴일 자동 제외 삭제 + 상품별 배송가능일 연동)
>   2. 관리자 매장 등록/관리 UI 추가
>   3. 발주 카탈로그에서 납품 불가 상품 선택 불가 + 가능일 표시

---

## 0. 사전 설정

```json
{
  "skipDangerousModePermissionPrompt": true,
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "permissions": {
    "allow": [
      "Read(**)", "Write(**)",
      "Bash(git *)", "Bash(mvn *)", "Bash(npm *)", "Bash(npx *)",
      "Bash(cd *)", "Bash(cat *)", "Bash(ls *)", "Bash(find *)",
      "Bash(grep *)", "Bash(mkdir *)", "Bash(cp *)", "Bash(mv *)",
      "Bash(rm *)", "Bash(java *)", "Bash(curl *)", "Bash(wc *)",
      "Bash(head *)", "Bash(tail *)", "Bash(sed *)"
    ]
  }
}
```

---

## 1. 실행 프롬프트

```
docs/AGENT_TEAMS_V6.3.md를 읽고 납품일 체계 수정 + 매장 관리 + 카탈로그 UX를 에이전트 팀으로 구현해줘.

프로젝트: /home/ubuntu/coffee-inventory
스택: Spring Boot 3 + JPA + Flyway + MySQL + React 18 + Tailwind + shadcn/ui
API 패턴: ApiResponse<T>, /api/v1/
기존 구현: V6 완료 상태

=== 4명 팀 구성 ===

■ ARCHITECT (설계/조율) — delegate mode, 코드 직접 작성 X
■ BACKEND (백엔드)
■ FRONTEND (프론트엔드)
■ TESTER (검증) — 발주 시나리오 10회 + 수정 + 10회

=== 비즈니스 핵심 규칙 (반드시 숙지) ===

이 시스템은 커피전문점 수발주 시스템이다.
커피전문점은 365일 운영한다. 따라서:

1. 일요일, 공휴일, 주말을 자동으로 제외하면 안 된다.
   → 납품일 달력에 모든 날짜(월~일)가 선택 가능해야 한다.
   → 어떤 날짜를 제외할지는 상품별 배송스케줄로 결정한다.
   → delivery_holiday 테이블은 유지하되, 달력 자체를 제한하지 않는다.

2. 상품별로 납품 가능 요일을 지정할 수 있어야 한다.
   → item_delivery_schedule 테이블: 월~일 7개 체크박스
   → 스케줄 미지정 = 365일 전체 납품 가능

3. 발주 시 납품일을 선택하면:
   → 카탈로그에 모든 상품이 보인다
   → 해당 날에 납품 가능한 상품 = 정상 선택 가능
   → 해당 날에 납품 불가한 상품 = 리스트에 보이되, 선택 불가(회색), 옆에 "납품가능: 월수금" 표시

=== 필수 규칙 ===
1. 기존 V6 코드 깨뜨리지 않기. 기존 발주/입고/클레임 API 하위호환.
2. Flyway 버전 기존 마지막 +1. 기존 버전 수정 금지.
3. 모든 팀메이트 작업 전 plan → ARCHITECT 승인 후 구현.
4. Phase 완료 시: git add . && git commit && git push
5. mvn clean compile && npm run build 확인 후 다음 Phase.
```

---

## 2. 에이전트별 상세 지시

---

### ■ ARCHITECT (설계/조율)

**Phase 0 — 분석**:

```
1. 현재 상태 파악
   - backend/src/main/resources/db/migration/ → 마지막 Flyway 버전
   - grep -r "item_delivery_schedule" backend/ → 테이블/엔티티 존재 여부
   - grep -r "DayOfWeek.SUNDAY" backend/ → 일요일 하드코딩 위치 전부 찾기
   - grep -r "holidays" backend/src/main/java/ → 공휴일 필터링 위치
   - cat backend/src/main/java/com/coffee/domain/ordering/service/DeliveryPolicyService.java → 전체 로직
   - cat frontend/src/pages/admin/ItemsPage.tsx → 상품 등록 폼 구조
   - cat frontend/src/pages/store/NewOrderPage.tsx → Step1(납품일) + Step2(카탈로그) 구조
   - cat backend/src/main/java/com/coffee/domain/org/controller/StoreController.java → 매장 API 현재 상태
   - ls frontend/src/pages/admin/ → 매장 관리 페이지 유무

2. 핵심 문제 확인
   A) DeliveryPolicyService.getAvailableDates()에서 일요일/공휴일/정책요일 필터링 → 모두 제거
   B) DeliveryPolicyService.isItemOrderableForDate()에서 정책 deliveryDays 체크 → item_delivery_schedule 체크로 교체
   C) ItemDeliverySchedule 엔티티/레포지토리/API 존재 여부
   D) StoreController가 SUPER_ADMIN 전용 → BRAND_ADMIN도 접근 가능하게
   E) 매장 관리 프론트엔드 페이지 없음

3. 파일 담당 분배
   BACKEND 전용:
     - DeliveryPolicyService.java (핵심 수정)
     - ItemDeliverySchedule 엔티티/레포/서비스 (없으면 생성)
     - ItemController.java (배송스케줄 엔드포인트 추가)
     - ItemService.java (배송스케줄 저장/조회 메서드)
     - StoreController.java (권한 확장)
     - store 테이블 확장 Flyway (status 컬럼)
     - CatalogService (카탈로그 응답에 배송가능일 포함)
     - DeliveryPolicyServiceTest.java (테스트 수정)
   FRONTEND 전용:
     - frontend/src/ 전체
   공유 금지:
     - 같은 Java 파일 동시 수정 X
```

---

### ■ BACKEND

---

#### TASK-120 | Flyway 마이그레이션

```sql
-- V{N}__v6_3_delivery_schedule_store.sql
-- 기존 마지막 Flyway 버전 확인 후 +1

-- A. item_delivery_schedule 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS item_delivery_schedule (
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

-- B. store 테이블에 status 컬럼 추가 (ACTIVE/SUSPENDED/CLOSED)
ALTER TABLE store ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE store ADD COLUMN IF NOT EXISTS address VARCHAR(300);
ALTER TABLE store ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE store ADD COLUMN IF NOT EXISTS open_date DATE;
ALTER TABLE store ADD COLUMN IF NOT EXISTS memo TEXT;

-- 기존 매장 전부 ACTIVE로
UPDATE store SET status = 'ACTIVE' WHERE status IS NULL;
```

**주의**: `grep -r "item_delivery_schedule" backend/src/main/resources/db/migration/`로 이미 존재하면 CREATE TABLE 부분 스킵.

---

#### TASK-121 | DeliveryPolicyService 전면 수정

**핵심: 일요일/공휴일/정책요일 자동 제외 전부 삭제**

**A. getAvailableDates() 수정**:

```java
public DeliveryPolicyDto.AvailableDateResponse getAvailableDates(Long storeId, int maxDays) {
    if (maxDays <= 0) maxDays = MAX_DISPLAY_DAYS;

    DeliveryPolicy policy = getStorePolicy(storeId);

    // 리드타임 계산 (정책이 있으면 사용, 없으면 기본값 2일)
    int leadDays = 2;
    if (policy != null) {
        LocalTime cutoffTime = policy.getCutoffTime();
        leadDays = LocalTime.now().isBefore(cutoffTime)
            ? policy.getCutoffLeadDaysBefore()
            : policy.getCutoffLeadDaysAfter();
    }

    LocalDate today = LocalDate.now();
    List<DeliveryPolicyDto.AvailableDate> availableDates = new ArrayList<>();
    boolean firstRecommended = false;

    for (int d = leadDays; d <= maxDays; d++) {
        LocalDate candidateDate = today.plusDays(d);

        // ★ 일요일 제외 삭제 — 365일 모든 날짜 표시
        // ★ 공휴일 제외 삭제 — 커피전문점은 365일 운영
        // ★ 정책 deliveryDays 필터 삭제 — 상품별 스케줄로 처리

        LocalDateTime deadline = (policy != null)
            ? calculateCutoff(candidateDate, policy)
            : candidateDate.minusDays(2).atTime(9, 0);

        if (deadline.isAfter(LocalDateTime.now())) {
            boolean isRecommended = !firstRecommended;
            if (isRecommended) firstRecommended = true;

            availableDates.add(DeliveryPolicyDto.AvailableDate.builder()
                .date(candidateDate)
                .dayOfWeek(candidateDate.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase())
                .isRecommended(isRecommended)
                .orderDeadline(deadline)
                .build());
        }
    }

    return DeliveryPolicyDto.AvailableDateResponse.builder()
        .availableDates(availableDates)
        .storeDeliveryType("ALL")  // 모든 날짜
        .cutoffTime(policy != null ? policy.getCutoffTime().toString() : "09:00")
        .maxDisplayDays(maxDays)
        .build();
}
```

**B. isItemOrderableForDate() 수정**:

```java
// 주입 추가 (클래스 상단)
private final ItemDeliveryScheduleRepository scheduleRepository;

public boolean isItemOrderableForDate(Long itemId, LocalDate deliveryDate, Long storeId) {
    Item item = itemRepository.findById(itemId).orElse(null);
    if (item == null || !Boolean.TRUE.equals(item.getIsOrderable())) {
        return false;
    }

    DayOfWeek dow = deliveryDate.getDayOfWeek();

    // ★ 일요일 체크 삭제 — 커피전문점은 일요일도 납품 가능
    // ★ 공휴일 체크 삭제 — 매장마다 다르므로 자동 제외 안 함
    // ★ 정책 deliveryDays 체크 삭제 — 상품별 스케줄로 대체

    // 1. 상품별 배송스케줄 체크 (유일한 요일 필터)
    Long brandId = item.getBrandId();
    Optional<ItemDeliverySchedule> schedule =
        scheduleRepository.findByItemIdAndBrandId(itemId, brandId);

    if (schedule.isPresent() && Boolean.TRUE.equals(schedule.get().getIsActive())
            && schedule.get().hasAnyDay()) {
        // 스케줄이 있고 하루라도 지정 → 해당 요일만 가능
        if (!schedule.get().isAvailable(dow)) {
            return false;
        }
    }
    // 스케줄 없거나 아무 요일도 체크 안 했으면 → 365일 전체 가능

    // 2. 리드타임 체크 (기존 유지)
    int itemLeadTime = item.getLeadTimeDays() != null ? item.getLeadTimeDays() : 2;
    DeliveryPolicy policy = getStorePolicy(storeId);
    int policyLeadDays = 2;
    if (policy != null) {
        policyLeadDays = LocalTime.now().isBefore(policy.getCutoffTime())
            ? policy.getCutoffLeadDaysBefore()
            : policy.getCutoffLeadDaysAfter();
    }
    int effectiveLeadDays = Math.max(itemLeadTime, policyLeadDays);
    return !deliveryDate.isBefore(LocalDate.now().plusDays(effectiveLeadDays));
}
```

**C. DeliveryPolicyServiceTest 수정**:

기존 테스트 중 수정 필요:
```
- "MON/WED/FRI만 포함" → 삭제 또는 "리드타임 이후 모든 날짜 포함"으로 변경
- "일요일 제외" → 삭제 (이제 일요일도 포함)
- "TUE_THU_SAT 정책" → 삭제
- "공휴일 제외" → 삭제 (달력에서는 제외 안 함)
- "첫번째 날짜 추천" → 유지
- "cutoff 계산" → 유지
- "아이템 orderable 체크" → 유지
- "리드타임 체크" → 유지

신규 테스트 추가:
- "스케줄 월수금 상품 + 화요일 납품 → false"
- "스케줄 월수금 상품 + 금요일 납품 → true"
- "스케줄 없는 상품 + 일요일 납품 → true" ← 핵심: 일요일도 가능
- "스케줄 없는 상품 + 토요일 납품 → true"
- "getAvailableDates → 14일 중 일요일 포함 확인"
```

---

#### TASK-122 | ItemDeliverySchedule 엔티티 + API

**먼저 확인**: `find backend/src -name "ItemDeliverySchedule*"` — 이미 존재하면 수정만.

**없으면 생성**:

```
1. 엔티티: domain/master/entity/ItemDeliverySchedule.java
   - id, itemId, brandId, mon~sun (Boolean), isActive, createdAt, updatedAt
   - isAvailable(DayOfWeek) 메서드
   - getDisplayDays() → "월수금" 형태 문자열
   - hasAnyDay() → 하루라도 true면 true

2. 레포지토리: domain/master/repository/ItemDeliveryScheduleRepository.java
   - findByItemIdAndBrandId(Long, Long)
   - findByBrandIdAndIsActiveTrue(Long)

3. ItemController에 엔드포인트 추가:
   GET    /api/v1/master/items/{itemId}/delivery-schedule
   PUT    /api/v1/master/items/{itemId}/delivery-schedule

4. ItemService에 메서드 추가:
   getDeliverySchedule(Long itemId) → DTO
   saveDeliverySchedule(Long itemId, DTO) → DTO

5. DTO: ItemDeliveryScheduleDto
   { itemId, mon, tue, wed, thu, fri, sat, sun, displayDays }
```

---

#### TASK-123 | 카탈로그 API — 응답에 배송가능일 + 주문가능여부 포함

**핵심**: 카탈로그에서 상품을 제외하지 않고, 모든 상품을 반환하되 `orderable` 플래그로 구분.

기존 카탈로그 API가 `isItemOrderableForDate()`로 상품을 필터링하고 있다면:

**변경**: 필터링 → 플래그 방식으로 변경

```java
// CatalogService 또는 해당 서비스에서
// 기존: orderable 상품만 반환
// 변경: 모든 상품 반환 + orderable 플래그 + deliveryDays 표시

for (Item item : allItems) {
    boolean orderable = deliveryPolicyService.isItemOrderableForDate(
        item.getId(), deliveryDate, storeId);

    // 배송스케줄 정보 조회
    String deliveryDays = null;
    Optional<ItemDeliverySchedule> schedule =
        scheduleRepository.findByItemIdAndBrandId(item.getId(), brandId);
    if (schedule.isPresent() && schedule.get().hasAnyDay()) {
        deliveryDays = schedule.get().getDisplayDays();  // "월수금"
    }

    catalogItems.add(CatalogItemDto.builder()
        // ...기존 필드 유지
        .orderable(orderable)           // ★ 신규: 주문 가능 여부
        .deliveryDays(deliveryDays)     // ★ 신규: "월수금" 또는 null(전체)
        .build());
}
```

**CatalogItemDto에 필드 추가**:
```java
private boolean orderable;        // 이 납품일에 주문 가능한지
private String deliveryDays;      // "월수금" 또는 null(전체 가능)
```

**기존 호환**: 기존에 orderable 상품만 필터링했던 로직이 있으면, 필터링을 제거하되 orderable=false 상품도 포함. 프론트에서 처리.

---

#### TASK-124 | 매장 관리 API 확장

**현재**: `StoreController`가 `@PreAuthorize("hasRole('SUPER_ADMIN')")` — BRAND_ADMIN 접근 불가.

**변경**:

```java
@RestController
@RequestMapping("/api/v1/org/stores")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")  // ★ BRAND_ADMIN 추가
public class StoreController {
    // ...

    @GetMapping
    public ResponseEntity<ApiResponse<List<StoreDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId,
            @AuthenticationPrincipal CustomUserDetails user) {
        // BRAND_ADMIN은 자기 브랜드 매장만
        if ("BRAND_ADMIN".equals(user.getRole()) && user.getBrandId() != null) {
            return ResponseEntity.ok(ApiResponse.ok(
                storeService.findByBrandId(user.getBrandId())));
        }
        List<StoreDto.Response> stores = brandId != null
            ? storeService.findByBrandId(brandId)
            : storeService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(stores));
    }

    // Create — BRAND_ADMIN은 자기 브랜드에만 추가 가능
    @PostMapping
    public ResponseEntity<ApiResponse<StoreDto.Response>> create(
            @Valid @RequestBody StoreDto.Request request,
            @AuthenticationPrincipal CustomUserDetails user) {
        if ("BRAND_ADMIN".equals(user.getRole()) && user.getBrandId() != null) {
            request.setBrandId(user.getBrandId()); // 강제로 자기 브랜드
        }
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(storeService.create(request), "Store created"));
    }
}
```

**StoreDto.Request 확장**:
```java
@Data
public class Request {
    private Long brandId;
    private String name;
    private String timezone;
    private String status;    // ACTIVE, SUSPENDED, CLOSED
    private String address;
    private String phone;
    private LocalDate openDate;
    private String memo;
}
```

**StoreDto.Response 확장**: 위 필드 전부 포함.

**StoreService.create/update**: 새 필드 저장.

---

#### BACKEND 규칙

```
- DayOfWeek.SUNDAY 하드코딩 체크를 전부 제거.
  → grep -rn "SUNDAY" backend/src/main/java/ 로 찾아서 전부 확인.
  → getAvailableDates, isItemOrderableForDate에서 제거.
  → 다른 곳(예: 스케줄러)에서도 일요일 제외 로직 있으면 확인.

- holidays 체크도 달력 단계에서 제거.
  → delivery_holiday 테이블은 유지 (향후 사용 가능).
  → 단, getAvailableDates()에서 holidays.contains() 제거.
  → isItemOrderableForDate()에서도 holidays 체크 제거.

- 카탈로그에서 상품 필터링(제외)하지 않기.
  → 모든 상품 반환 + orderable 플래그.

- 기존 confirmCart, modifyOrder 등은 건드리지 않기.

- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현.
- 매 TASK 완료 시 mvn clean compile 확인.
```

---

### ■ FRONTEND

---

#### TASK-130 | 상품 등록/수정 — 배송요일 체크박스

**파일**: `frontend/src/pages/admin/ItemsPage.tsx`

상품 생성/수정 Dialog에 배송요일 섹션 추가:

```
┌────────────────────────────────────────────┐
│  📦 납품 가능 요일                          │
│  선택하지 않으면 매일 납품 가능              │
│                                            │
│  [월] [화] [수] [목] [금] [토] [일]         │
│   ✓         ✓         ✓                   │
│                                            │
│  미선택 = 매일(월~일) 납품 가능             │
└────────────────────────────────────────────┘
```

구현:
```
- 상태: deliverySchedule = { mon, tue, wed, thu, fri, sat, sun }
- 수정 모드: GET /api/v1/master/items/{id}/delivery-schedule 로드
- 저장: 상품 저장 후 PUT /api/v1/master/items/{id}/delivery-schedule
- 7개 토글 버튼 (월~일). 선택=파란색, 미선택=회색
- 일요일(일) 포함 — 커피전문점이라 일요일 납품도 가능
- 아무것도 안 선택 = "매일 가능" 표시
```

**API 클라이언트** (`master.ts`에 추가):
```typescript
export interface DeliverySchedule {
  itemId?: number;
  mon: boolean; tue: boolean; wed: boolean;
  thu: boolean; fri: boolean; sat: boolean; sun: boolean;
  displayDays?: string;
}

// masterApi에 추가
getItemDeliverySchedule: (itemId: number) =>
  client.get<ApiResponse<DeliverySchedule>>(`/master/items/${itemId}/delivery-schedule`),
saveItemDeliverySchedule: (itemId: number, data: DeliverySchedule) =>
  client.put<ApiResponse<DeliverySchedule>>(`/master/items/${itemId}/delivery-schedule`, data),
```

---

#### TASK-131 | 발주 카탈로그 — 납품불가 상품 선택 불가 + 가능일 표시

**파일**: `frontend/src/pages/store/NewOrderPage.tsx` (Step 2)

**핵심 UX 변경**:

```
납품일: 3/10(월) 선택 상태

┌─────────────────────────────────────────────────┐
│ 🏷 에스프레소 원두 1kg          [월수금]  ← 배지 │
│ CF-001 | 봉 | ₩25,000                          │
│ 재고: 2.5kg | 소진: 2일 후                       │
│ AI 추천: 3봉          [−] [3] [+]               │ ← 월요일 = 가능, 선택 가능
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🏷 우유 1L                [화목토]  ← 배지       │
│ ML-001 | EA | ₩3,500                            │
│ 재고: 10ea                                       │
│                                                  │
│ ⚠ 월요일 납품 불가 — 납품가능: 화,목,토          │ ← 회색, 선택 불가
└─────────────────────────────────────────────────┘
```

구현:
```
1. 카탈로그 API 응답의 orderable, deliveryDays 필드 사용

2. orderable=true인 상품:
   - 정상 스타일 (기존과 동일)
   - 수량 조절 가능
   - 배송요일 배지 표시 (있으면)

3. orderable=false인 상품:
   - 카드 배경 회색 (bg-gray-100 opacity-60)
   - 수량 버튼 비활성화 (disabled)
   - 경고 메시지: "X요일 납품 불가 — 납품가능: 월,수,금"
   - 카드 터치해도 수량 추가 안 됨
   - 배송요일 배지 표시

4. 배송요일 배지 색상:
   - "전체" (null/빈값) → 초록 (bg-green-100 text-green-800)
   - "월수금" 등 특정 요일 → 파랑 (bg-blue-100 text-blue-800)

5. 기존 lowStockOnly 필터 유지
6. 신규: "주문가능만 보기" 토글 추가 (orderable=true만 필터)
```

**ordering API 타입 수정** (`frontend/src/api/ordering.ts`):
```typescript
export interface CatalogItem {
  // ...기존 필드
  orderable: boolean;        // 신규
  deliveryDays: string | null;  // 신규: "월수금" 또는 null
}
```

---

#### TASK-132 | 매장 관리 페이지 신규

**라우트**: `/admin/stores`
**App.tsx에 추가**: `<Route path="/admin/stores" element={<StoresPage />} />`
**AdminLayout navKeys에 추가**: 또는 V6의 그룹 네비게이션에 포함

```
┌────────────────────────────────────────────────────────┐
│  매장 관리                              [+ 매장 등록]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  상태: [전체] [운영중] [보류] [폐점]                    │
│  검색: [매장명 검색...]                                 │
│                                                        │
│  ┌──────┬──────────┬─────────┬──────┬───────┬──────┐  │
│  │ ID   │ 매장명    │ 주소     │ 상태  │ 개점일  │ 관리 │  │
│  ├──────┼──────────┼─────────┼──────┼───────┼──────┤  │
│  │ 1    │ 강남역점  │ 강남구...│ 운영중│ 2024-01│ [수정]│  │
│  │ 2    │ 홍대점    │ 마포구...│ 운영중│ 2024-03│ [수정]│  │
│  │ 3    │ 신촌점    │ 서대문...│ 보류  │ 2025-01│ [수정]│  │
│  └──────┴──────────┴─────────┴──────┴───────┴──────┘  │
│                                                        │
│  « 이전  1/3  다음 »                                    │
└────────────────────────────────────────────────────────┘
```

**등록/수정 Dialog**:
```
┌────────────────────────────────────────┐
│  매장 등록                              │
│                                        │
│  매장명:  [                          ]  │
│  주소:    [                          ]  │
│  전화:    [                          ]  │
│  타임존:  [Asia/Tokyo ▼]               │
│  개점일:  [2026-03-01]                 │
│  상태:    (●) 운영중  ( ) 보류  ( ) 폐점│
│  메모:    [                          ]  │
│                                        │
│           [취소]          [저장]         │
└────────────────────────────────────────┘
```

**API**: 기존 `/api/v1/org/stores` 사용 (BACKEND에서 BRAND_ADMIN 권한 추가됨)

**API 클라이언트** (`frontend/src/api/` — 신규 또는 기존 확장):
```typescript
export const storeApi = {
  getStores: (brandId?: number) =>
    client.get<ApiResponse<Store[]>>('/org/stores', { params: { brandId } }),
  createStore: (data: StoreRequest) =>
    client.post<ApiResponse<Store>>('/org/stores', data),
  updateStore: (id: number, data: StoreRequest) =>
    client.put<ApiResponse<Store>>(`/org/stores/${id}`, data),
};
```

---

#### TASK-133 | i18n 키 추가

```json
// ko.json 추가
{
  "items": {
    "deliveryDays": "납품 가능 요일",
    "deliveryDaysHint": "선택하지 않으면 매일(월~일) 납품 가능",
    "deliveryDaysNone": "미선택 = 매일 납품 가능",
    "notOrderableToday": "{{day}} 납품 불가",
    "availableDays": "납품가능: {{days}}",
    "allDays": "매일",
    "orderableOnly": "주문가능만"
  },
  "days": {
    "mon": "월", "tue": "화", "wed": "수",
    "thu": "목", "fri": "금", "sat": "토", "sun": "일"
  },
  "stores": {
    "title": "매장 관리",
    "addStore": "매장 등록",
    "editStore": "매장 수정",
    "name": "매장명",
    "address": "주소",
    "phone": "전화번호",
    "timezone": "타임존",
    "openDate": "개점일",
    "memo": "메모",
    "status": { "ACTIVE": "운영중", "SUSPENDED": "보류", "CLOSED": "폐점" },
    "created": "매장이 등록되었습니다",
    "updated": "매장이 수정되었습니다",
    "loadFailed": "매장 목록을 불러오지 못했습니다"
  }
}

// ja.json
{
  "items": {
    "deliveryDays": "納品可能曜日",
    "deliveryDaysHint": "未選択の場合、毎日（月～日）納品可能",
    "deliveryDaysNone": "未選択 = 毎日納品可能",
    "notOrderableToday": "{{day}}納品不可",
    "availableDays": "納品可能: {{days}}",
    "allDays": "毎日",
    "orderableOnly": "注文可能のみ"
  },
  "days": {
    "mon": "月", "tue": "火", "wed": "水",
    "thu": "木", "fri": "金", "sat": "土", "sun": "日"
  },
  "stores": {
    "title": "店舗管理",
    "addStore": "店舗登録",
    "editStore": "店舗修正",
    "status": { "ACTIVE": "営業中", "SUSPENDED": "休止", "CLOSED": "閉店" }
  }
}

// en.json
{
  "items": {
    "deliveryDays": "Delivery Days",
    "deliveryDaysHint": "If none selected, delivery available every day",
    "deliveryDaysNone": "None = available every day",
    "notOrderableToday": "Not available on {{day}}",
    "availableDays": "Available: {{days}}",
    "allDays": "Every day",
    "orderableOnly": "Orderable only"
  },
  "days": {
    "mon": "Mon", "tue": "Tue", "wed": "Wed",
    "thu": "Thu", "fri": "Fri", "sat": "Sat", "sun": "Sun"
  },
  "stores": {
    "title": "Store Management",
    "addStore": "Add Store",
    "editStore": "Edit Store",
    "status": { "ACTIVE": "Active", "SUSPENDED": "Suspended", "CLOSED": "Closed" }
  }
}
```

---

#### FRONTEND 규칙
```
- 기존 라우트 유지. /admin/stores만 추가.
- 배송요일에 일요일(日/Sun) 반드시 포함 — 7개 버튼.
- 카탈로그에서 상품 제거하지 않기. orderable=false도 표시하되 회색+비활성.
- 모바일 퍼스트, 터치 타겟 48px+.
- i18n 하드코딩 금지.
```

---

### ■ TESTER

---

#### Phase 테스트

```
T-60: TASK-120 마이그레이션 검증
  - Flyway 정상 적용
  - item_delivery_schedule 테이블 존재
  - store.status 컬럼 존재

T-61: TASK-121 DeliveryPolicyService 검증
  - GET /ordering/delivery-dates → 일요일 포함 확인
  - GET /ordering/delivery-dates → 14일 중 모든 날짜 포함 (리드타임 이후)

T-62: TASK-122 상품 배송스케줄 API 검증
  - PUT /master/items/{id}/delivery-schedule → 월수금 저장
  - GET /master/items/{id}/delivery-schedule → 월수금 반환

T-63: TASK-123 카탈로그 검증 (핵심)
  - 상품A: 스케줄 "월수금"
  - 상품B: 스케줄 없음 (전체)
  - 화요일 납품일 선택:
    → 상품A: orderable=false, deliveryDays="월수금"
    → 상품B: orderable=true, deliveryDays=null
  - 금요일 납품일 선택:
    → 상품A: orderable=true
    → 상품B: orderable=true
  - 일요일 납품일 선택:
    → 상품A: orderable=false (일요일 미체크)
    → 상품B: orderable=true (전체)

T-64: TASK-124 매장 관리 검증
  - BRAND_ADMIN으로 매장 목록 조회
  - 매장 생성 (이름, 주소, 상태)
  - 매장 수정 (상태 → 보류)

T-65: TASK-130 상품 배송요일 UI 검증
  - 상품 수정 → 월수금 선택 → 저장 → 재조회 확인

T-66: TASK-131 카탈로그 UX 검증
  - 납품불가 상품: 회색, 선택 불가, "납품가능: 월수금" 표시
  - 납품가능 상품: 정상 선택 가능

T-67: TASK-132 매장 관리 UI 검증
  - 매장 목록 표시
  - 신규 등록 Dialog
  - 상태 변경

T-68: 빌드
  - mvn clean compile
  - npm run build

T-69: 기존 기능 회귀
  - 카트 → 확정 → 입고 흐름 정상
  - 기존 URL 접근 정상
```

---

#### Round 1: 발주 시나리오 10회

```
SC-01: 월요일 납품 표준 발주
  1. delivery-dates → 다음 월요일 선택
  2. catalog → 월요일 가능 상품만 orderable=true 확인
  3. 가능 상품 3개 장바구니 → 확정
  기대: 정상 발주

SC-02: 일요일 납품 발주 (핵심 — 기존에 불가했던 케이스)
  1. delivery-dates → 다음 일요일 선택 가능 확인
  2. catalog → 스케줄 없는 상품 orderable=true 확인
  3. 장바구니 → 확정
  기대: 일요일 발주 정상

SC-03: 토요일 납품 발주
  기대: 토요일 발주 정상

SC-04: 납품불가 상품 장바구니 추가 시도
  1. 월요일 선택
  2. "화목" 스케줄 상품 장바구니 추가 시도
  기대: 프론트에서 선택 불가. 서버에서도 검증(400 에러)

SC-05: 카탈로그에 모든 상품 표시 확인
  1. 아무 날짜 선택
  2. orderable=true + orderable=false 모두 포함
  기대: 전체 상품 목록, orderable 플래그 정확

SC-06: 발주 → 입고 → 재고 반영
  SC-01 후 입고 처리 → 재고 증가 확인
  기대: 기존과 동일

SC-07: 매장 생성 → 해당 매장으로 발주
  1. BRAND_ADMIN으로 매장 생성
  2. 생성된 매장으로 발주
  기대: 정상 동작

SC-08: 상품 배송스케줄 변경 → 카탈로그 반영
  1. 상품A 스케줄: 월수금 → 저장
  2. 화요일 카탈로그: 상품A orderable=false 확인
  3. 상품A 스케줄: 매일 → 저장 (전체 해제)
  4. 화요일 카탈로그: 상품A orderable=true 확인
  기대: 스케줄 변경 즉시 반영

SC-09: 빈 장바구니 확정 → 에러
  기대: 400 에러

SC-10: 기존 재발주 기능 정상
  POST /ordering/reorder/{id} → 정상
```

**Round 1 결과**: `docs/V6_3_ROUND1_RESULTS.md`

---

#### 수정 → Round 2

Round 1 실패 건 수정 후 SC-01~10 재실행 + SC-11~20:

```
SC-11: 모든 요일 체크 상품 (월~일) → 어떤 날이든 orderable=true
SC-12: 아무 요일도 체크 안 한 상품 → 어떤 날이든 orderable=true
SC-13: 토요일만 체크 → 토요일만 orderable=true, 나머지 false
SC-14: 리드타임 5일 상품 → 가까운 날짜 orderable=false
SC-15: 매장 상태 SUSPENDED → 발주 시도 (비즈니스 로직 확인)
SC-16: 연속 발주 3건 (다른 납품일) → 전부 정상
SC-17: npm run build 성공
SC-18: 기존 대시보드 로드 정상
SC-19: 기존 클레임 등록 정상
SC-20: 기존 재고실사 정상
```

**Round 2 결과**: `docs/V6_3_ROUND2_RESULTS.md`

---

## 3. 작업 흐름

```
Phase 0 — 분석 (전원)

Phase 1 — DB + 백엔드 핵심 (BACKEND)
  BACKEND: TASK-120 (마이그레이션) → TASK-121 (DeliveryPolicy 수정) → TASK-122 (스케줄 API)
  FRONTEND: TASK-130 (상품 배송요일 UI) — mock 데이터로 시작
  TESTER: T-60~T-62

Phase 2 — 카탈로그 + 매장 (BACKEND ‖ FRONTEND)
  BACKEND: TASK-123 (카탈로그 수정) → TASK-124 (매장 API 확장)
  FRONTEND: TASK-131 (카탈로그 UX) → TASK-132 (매장 관리 페이지) → TASK-133 (i18n)
  TESTER: T-63~T-69

Phase 3 — Round 1 (10회)
  TESTER: SC-01~10 → 결과 기록
  ARCHITECT: 분석 → 수정 지시

Phase 4 — 수정
  BACKEND/FRONTEND: 실패 건 수정
  TESTER: 재테스트

Phase 5 — Round 2 (10회)
  TESTER: SC-01~20 → 결과 기록

Phase 6 — 종료
  ARCHITECT: docs/V6_3_FINAL_REPORT.md → git push
```

---

## 4. 체크박스

### Phase 1
- [ ] TASK-120 | Flyway 마이그레이션
- [ ] TASK-121 | DeliveryPolicyService 전면 수정
- [ ] TASK-122 | ItemDeliverySchedule 엔티티 + API
- [ ] TASK-130 | 상품 배송요일 UI

### Phase 2
- [ ] TASK-123 | 카탈로그 API orderable 플래그
- [ ] TASK-124 | 매장 관리 API 확장
- [ ] TASK-131 | 카탈로그 납품불가 UX
- [ ] TASK-132 | 매장 관리 페이지
- [ ] TASK-133 | i18n

### Phase 3~5
- [ ] Round 1: SC-01~10
- [ ] 수정
- [ ] Round 2: SC-01~20

### Phase 6
- [ ] 종료 보고서

---

## 5. 종료 보고서 양식

`docs/V6_3_FINAL_REPORT.md`:

```markdown
# V6.3 종료 보고서

## 1. 구현 완료
- 납품일: 365일 전체 선택 가능 (일요일/공휴일 자동 제외 삭제)
- 상품별 배송요일: 월~일 7일 체크, 미지정=매일 가능
- 카탈로그: 모든 상품 표시, 불가 상품은 회색+비활성+가능일 표시
- 매장 관리: BRAND_ADMIN 매장 등록/수정/상태변경

## 2. Round 1/2 결과
## 3. 수정 사항
## 4. 잔여 이슈
## 5. 빌드 결과
```
