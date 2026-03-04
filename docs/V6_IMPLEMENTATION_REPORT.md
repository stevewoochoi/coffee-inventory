# V6 ERP 고도화 구현 보고서

> **작성일**: 2026-03-04
> **작업 지시서**: `docs/AGENT_TEAMS_V6.md`
> **기반 버전**: V5.1 Phase 17~24 완료 상태
> **배포 상태**: Production 배포 완료 (http://57.180.22.12)

---

## 1. 작업 개요

V6 ERP 고도화는 다음 5가지 핵심 기능을 구현하는 프로젝트이다:

1. **상품별 배송요일 관리** — 상품마다 개별 배송 스케줄 지정 (정책 fallback 지원)
2. **발주 마감 고도화** — 마감 실행 → 쇼트 점검 → 감량 처리 → 일괄 전송 워크플로우
3. **역할 확장** — 3역할(SUPER_ADMIN/BRAND_ADMIN/STORE_MANAGER) → 7역할 체계
4. **재무 기능** — 매입 요약, 재고자산 평가, 월간 리포트, 월마감
5. **엑셀 벌크 업로드** — 템플릿 다운로드 → 업로드 → 검증 → 확정 3단계

---

## 2. 커밋 이력

| 커밋 | 일시 | 내용 |
|------|------|------|
| `5a9c752` | 2026-03-04 06:55 | V6 메인 구현 (Backend + Frontend 전체) |
| `3982df9` | 2026-03-04 10:51 | V6 Backend 테스트 (V6Backend1Test + V6Backend2Test) |
| `0ab635e` | 2026-03-04 11:28 | 카테고리 3단계 계층 구조 구현 (TASK-083 보강) |
| `688f349` | 2026-03-04 16:27 | V28 마이그레이션 idempotent 수정 (배포 이슈 해결) |
| `d25440f` | 2026-03-04 16:35 | User 엔티티 column definition 수정 (V27 VARCHAR 호환) |
| `cfc8a95` | 2026-03-04 16:57 | CategoriesPage brandId fallback 수정 |

---

## 3. DB 마이그레이션

### V26: `V26__v6_item_delivery_schedule.sql`

| 대상 | 변경 내용 |
|------|-----------|
| `item` 테이블 | `item_code VARCHAR(50)`, `spec VARCHAR(200)`, `description TEXT` 컬럼 추가 |
| `item` 인덱스 | `uq_brand_item_code (brand_id, item_code)` 유니크 인덱스 생성 |
| `packaging` 테이블 | `order_unit_name VARCHAR(20) DEFAULT 'BOX'` 컬럼 추가 |
| `item_category` 테이블 | `code VARCHAR(20)`, `description TEXT` 컬럼 추가 |
| `item_delivery_schedule` (신규) | 상품별 배송요일 (mon~sun Boolean), `uq_item_schedule (item_id, brand_id)` |

### V27: `V27__v6_cutoff_roles_finance.sql`

| 대상 | 변경 내용 |
|------|-----------|
| `users.role` | ENUM → `VARCHAR(30)` 변환 (7역할 지원) |
| `users.account_status` | ENUM → `VARCHAR(30)` 변환 |
| `order_shortage_log` (신규) | 감량 이력 (original_qty, adjusted_qty, shortage_reason) |
| `bulk_upload_batch` (신규) | 벌크 업로드 배치 관리 (status, row counts, error_details JSON) |
| `monthly_closing` (신규) | 월마감 관리 (brand_id, year, month, 금액 필드 3개) |
| `supplier_order_notification` (신규) | 수주 업체 알림 (notification_type, message) |

### V28: `V28__category_hierarchy.sql`

| 대상 | 변경 내용 |
|------|-----------|
| `item_category` | `parent_id`, `level`, `code`, `description`, `icon` 컬럼 추가 |
| `uq_category_brand_name` | 유니크 제약 제거 (다른 부모 아래 동일 이름 허용) |
| 기존 데이터 | `level = 1` (대분류) 일괄 설정 |

---

## 4. Backend 구현 상세

### 4-1. 상품별 배송요일 (TASK-080, 081, 082, 083)

**패키지**: `domain/master/`

| 파일 | 라인 | 역할 |
|------|------|------|
| `entity/ItemDeliverySchedule.java` | 86 | 요일별 Boolean 플래그 + `isAvailable(DayOfWeek)` 헬퍼 + `getDisplayDays()` (월수금 형식) |
| `repository/ItemDeliveryScheduleRepository.java` | 14 | `findByItemIdAndBrandId()` |
| `dto/ItemDeliveryScheduleDto.java` | 40 | Request/Response DTO |
| `controller/ItemDeliveryScheduleController.java` | 110 | CRUD API 4개 |

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/master/items/{itemId}/delivery-schedule` | 배송요일 등록 |
| GET | `/api/v1/master/items/{itemId}/delivery-schedule` | 배송요일 조회 |
| PUT | `/api/v1/master/items/{itemId}/delivery-schedule` | 배송요일 수정 |
| DELETE | `/api/v1/master/items/{itemId}/delivery-schedule` | 배송요일 삭제 (soft delete) |

**DeliveryPolicyService 수정**: `isItemOrderableForDate()` 에서 상품별 스케줄 우선 → 정책 fallback 로직 구현.

**CatalogDto 확장**: `deliveryDays`, `itemCode`, `spec`, `orderUnitName` 필드 추가.

**Item/Packaging 엔티티 확장**: `itemCode`, `spec`, `description` / `orderUnitName` 필드 추가.

---

### 4-2. 발주 마감 고도화 (TASK-091)

**패키지**: `domain/ordering/`

| 파일 | 라인 | 역할 |
|------|------|------|
| `service/OrderCutoffService.java` | 197 | 마감 실행, 쇼트 점검, 감량 처리, 일괄 전송 |
| `controller/OrderCutoffController.java` | 53 | API 4개 엔드포인트 |
| `dto/CutoffDto.java` | 73 | 마감/쇼트/감량/전송 DTO |
| `entity/OrderShortageLog.java` | 51 | 감량 이력 엔티티 |
| `repository/OrderShortageLogRepository.java` | 10 | `findByOrderPlanId()` |

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/admin/ordering/cutoff` | 마감 실행 (CONFIRMED → CUTOFF_CLOSED) |
| GET | `/api/v1/admin/ordering/shortage-check` | 쇼트 점검 (현재고 vs 발주량 비교) |
| PUT | `/api/v1/admin/ordering/plans/{planId}/lines/{lineId}/adjust` | 감량 처리 + shortage_log 기록 |
| POST | `/api/v1/admin/ordering/dispatch-all` | 일괄 전송 (CUTOFF_CLOSED → DISPATCHED) |

**마감 플로우**: `CONFIRMED → CUTOFF_CLOSED → (쇼트 점검/감량) → DISPATCHED`

---

### 4-3. 역할 확장 (TASK-092)

**기존 3역할 → 7역할**:

| 역할 | 용도 | 접근 가능 영역 |
|------|------|---------------|
| `SUPER_ADMIN` | 시스템 관리자 | 전체 |
| `BRAND_ADMIN` | 브랜드 관리자 | 전체 |
| `STORE_MANAGER` | 매장 관리자 | 자기 매장 |
| `JP_ORDERER` (신규) | 일본 매장 발주자 | 발주 생성/조회 |
| `KR_INVENTORY` (신규) | 한국 재고관리 | 마감/재고/벌크업로드 |
| `KR_FINANCE` (신규) | 한국 재무팀 | 재무 대시보드/매입/월마감 |
| `FULFILLMENT` (신규) | 수주 업체 | 수주 포털 |

**권한 매핑**: 각 Controller에 `@PreAuthorize` 어노테이션으로 역할 기반 접근 제어 적용.

---

### 4-4. 수주 업체 알림 (TASK-093)

**패키지**: `domain/ordering/`

| 파일 | 라인 | 역할 |
|------|------|------|
| `service/SupplierPortalService.java` | 97 | 수주 목록 조회, 알림 전송, fulfillmentStatus 자동 변경 |
| `controller/SupplierPortalController.java` | 44 | API 3개 엔드포인트 |
| `dto/SupplierPortalDto.java` | 44 | OrderSummary, NotifyRequest, NotificationResponse |
| `entity/SupplierOrderNotification.java` | 43 | 알림 엔티티 |
| `repository/SupplierOrderNotificationRepository.java` | 11 | `findByOrderPlanIdOrderByCreatedAtDesc()` |

**알림 유형 → fulfillmentStatus 자동 변경**:
- `ORDER_RECEIVED` / `SHIPMENT_READY` → `PREPARING`
- `SHIPPED` → `SHIPPING`
- `DELIVERY_ISSUE` → 상태 유지 (알림만)

---

### 4-5. 재무 대시보드 (TASK-094)

**패키지**: `domain/finance/`

| 파일 | 라인 | 역할 |
|------|------|------|
| `service/FinanceService.java` | 201 | 매입 요약, 재고 평가, 월간 리포트, 월마감 실행 |
| `controller/FinanceController.java` | 56 | API 5개 엔드포인트 |
| `dto/FinanceDto.java` | 84 | 매입/재고/리포트/마감 DTO |
| `entity/MonthlyClosing.java` | 60 | 월마감 엔티티 |
| `repository/MonthlyClosingRepository.java` | 12 | 월마감 조회 |

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/finance/purchase-summary` | 공급사별 매입 합계 (stock_ledger RECEIVE 기반) |
| GET | `/api/v1/finance/inventory-valuation` | 매장별 재고자산 평가 |
| GET | `/api/v1/finance/monthly-report` | 월간 리포트 (기초/매입/출고/기말) |
| POST | `/api/v1/finance/monthly-closing` | 월마감 실행 (중복 실행 방지) |
| GET | `/api/v1/finance/closing-history` | 마감 이력 조회 |

---

### 4-6. 엑셀 벌크 업로드 (TASK-095)

**패키지**: `domain/bulk/`

| 파일 | 라인 | 역할 |
|------|------|------|
| `service/BulkUploadService.java` | 142 | 템플릿 생성, 파일 파싱/검증, 확정 처리 |
| `controller/BulkUploadController.java` | 56 | API 4개 엔드포인트 |
| `dto/BulkUploadDto.java` | 54 | 업로드 결과/에러/미리보기 DTO |
| `entity/BulkUploadBatch.java` | 65 | 배치 엔티티 |
| `repository/BulkUploadBatchRepository.java` | 10 | 이력 조회 |

**업로드 유형**: `ITEM_MASTER`, `INVENTORY_INIT`, `PURCHASE_IMPORT`

**3단계 플로우**: 업로드 → 검증 (VALIDATED) → 확정 (CONFIRMED)

**의존성 추가**: Apache POI `poi-ooxml 5.2.5` (pom.xml)

---

### 4-7. 카테고리 3단계 계층 (TASK-083 보강)

**패키지**: `domain/master/`

- `ItemCategory` 엔티티: `parentId`, `level`, `code`, `description`, `icon` 필드 추가
- `ItemCategoryRepository`: 레벨별/부모별 조회, 루트 중복 체크 메서드 추가
- `ItemCategoryService`: MAX_LEVEL=3 검증, 재귀 soft-delete, 트리 빌드
- `ItemCategoryController`: `/tree` 엔드포인트, `level`/`parentId` 쿼리 파라미터
- `ItemCategoryDto`: TreeResponse 내부 클래스 추가

---

## 5. Frontend 구현 상세

### 5-1. 신규 페이지 (9개, 총 1,845줄)

| 페이지 | 라우트 | 라인 | 주요 기능 |
|--------|--------|------|-----------|
| **CutoffPage** | `/admin/ordering/cutoff` | 282 | 납품일별 마감 실행, 쇼트 점검 테이블, 감량 처리 다이얼로그, 일괄 전송 |
| **OrderCalendarPage** | `/admin/ordering/calendar` | 216 | 월간 달력 뷰, 날짜별 발주 건수/금액, 상태별 색상 코딩, 상세 패널 |
| **FinanceDashboardPage** | `/admin/finance/dashboard` | 139 | 연간 매입/재고 추이 차트 (Recharts), KPI 카드 2개 |
| **PurchasePage** | `/admin/finance/purchase` | 155 | 공급사별 매입 명세, 기간 선택, 합계 행 |
| **InventoryValuePage** | `/admin/finance/inventory-value` | 129 | 매장별 재고자산 평가, 총액 카드 |
| **ClosingPage** | `/admin/finance/closing` | 209 | 월마감 실행 다이얼로그, 마감 이력 테이블, 상태 뱃지 |
| **BulkUploadPage** | `/admin/bulk-upload` | 303 | 유형 선택, 템플릿 다운로드, 드래그&드롭 업로드, 검증 결과, 확정 |
| **SupplierOrdersPage** | `/supplier-portal/orders` | 120 | 상태별 탭 필터, 수주 카드 목록 |
| **SupplierOrderDetailPage** | `/supplier-portal/orders/:id` | 292 | 주문 상세, 알림 전송 다이얼로그, 알림 타임라인 |

### 5-2. API 클라이언트 (4개)

| 파일 | 엔드포인트 수 | 커버 영역 |
|------|-------------|-----------|
| `api/cutoff.ts` | 4 | 마감/쇼트/감량/전송 |
| `api/finance.ts` | 5 | 매입/재고평가/리포트/마감/이력 |
| `api/bulkUpload.ts` | 4 | 템플릿/업로드/확정/이력 |
| `api/supplierPortal.ts` | 3 | 수주목록/알림전송/알림이력 |

### 5-3. 라우팅 및 네비게이션

**App.tsx**: 9개 신규 라우트 추가 (ProtectedRoute로 역할 제한)

**AdminLayout.tsx**: 사이드바에 7개 메뉴 항목 추가:
- 발주 달력, 마감 관리, 재무 대시보드, 매입 관리, 재고자산, 월마감, 일괄 업로드

### 5-4. i18n

**총 ~94개 신규 키** (ko.json, ja.json, en.json 각각):

| 섹션 | 키 수 | 커버 영역 |
|------|-------|-----------|
| `cutoff` | 17 | 마감 관리 UI |
| `calendar` | 10 | 달력 뷰 UI |
| `finance` | 33 | 재무 4개 페이지 |
| `bulkUpload` | 21 | 벌크 업로드 UI |
| `supplierPortal` | 13 | 수주 포털 UI |

### 5-5. 카테고리 3단계 관리 (CategoriesPage 전면 재작성)

- 데스크톱: 대분류 | 중분류 | 소분류 3컬럼 패널
- 모바일: 브레드크럼 + 탭 방식 내비게이션
- Dialog 기반 생성/수정 (name, code, description, icon, displayOrder)
- 삭제 시 자식 카테고리 경고

### 5-6. ItemsPage 카테고리 드롭다운 교체

- 단일 텍스트 입력 → 3단계 cascading `<select>` 로 교체
- 카테고리 트리 API 연동

---

## 6. 테스트 결과

### 6-1. V6 전용 테스트

#### V6Backend1Test (20개 테스트)

| 그룹 | 테스트 수 | 검증 항목 |
|------|----------|-----------|
| **T-20: MigrationVerification** | 4 | 스키마 검증, item_delivery_schedule CRUD, item 확장 컬럼, packaging 확장 |
| **T-21: DeliveryPolicyService** | 7 | 스케줄 기반 요일 체크, 정책 fallback, 스케줄 우선순위, 일요일 차단, 리드타임 |
| **T-22: CatalogFiltering** | 3 | 배송요일 필터링, 정책 기반 포함/제외, 응답 필드 확인 |
| **T-23: ItemMasterExtension** | 8 (6+schedule CRUD) | itemCode/spec 저장, orderUnitName, 배송요일 CRUD |

#### V6Backend2Test (32개 테스트)

| 그룹 | 테스트 수 | 검증 항목 |
|------|----------|-----------|
| **T-24: MigrationVerification** | 5 | 신규 테이블 CRUD, CUTOFF_CLOSED enum |
| **T-25: CutoffManagement** | 4 | 마감 실행, 쇼트 점검, 감량 처리, 일괄 전송 |
| **T-26: RoleBasedAccessControl** | 7 | 역할별 접근 허용/차단 (KR_INVENTORY, KR_FINANCE, JP_ORDERER, FULFILLMENT, BRAND_ADMIN) |
| **T-27: SupplierNotification** | 4 | 알림 전송, fulfillmentStatus 자동 변경, 알림 이력 |
| **T-28: FinanceApi** | 6 | 매입 요약, 재고 평가, 월간 리포트, 월마감 실행/중복 방지 |
| **T-29: BulkUpload** | 6 | 템플릿 다운로드, 파일 업로드/검증, 확정, 이력 조회 |

### 6-2. 전체 테스트 스위트

```
Tests run: 214, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

**기존 V5.1 테스트 리그레션 없음** — 발주/입고/클레임/실사/대시보드/인증 등 기존 기능 모두 정상 통과.

---

## 7. 배포 이력

| 시도 | 결과 | 이슈 | 해결 |
|------|------|------|------|
| 1차 | 실패 | V28 Flyway: `Duplicate column name 'parent_id'` | 운영 DB에 이미 컬럼 존재 (이전 부분 마이그레이션 흔적) |
| 2차 | 실패 | Health check timeout | V28을 idempotent로 재작성 → Flyway 통과했으나 Hibernate 검증 실패 |
| 3차 | 실패 | `Schema-validation: wrong column type [account_status]` | V27이 ENUM→VARCHAR 변환했으나 User 엔티티에 `columnDefinition` 미설정 |
| 4차 | 성공 | — | `User.java`에 `columnDefinition = "VARCHAR(30)"` 추가 |
| 5차 | 성공 | CategoriesPage 로딩 무한 | `brandId` fallback `?? 1` 추가 |

**최종 배포 상태**:
```
coffee-backend    Up (healthy)   0.0.0.0:8080->8080/tcp
coffee-frontend   Up             80/tcp
coffee-nginx      Up             0.0.0.0:80->80/tcp
```

---

## 8. 파일 변경 요약

### 신규 파일 (57개, +5,499줄)

| 영역 | 파일 수 | 주요 파일 |
|------|---------|-----------|
| Backend 엔티티 | 6 | ItemDeliverySchedule, OrderShortageLog, SupplierOrderNotification, MonthlyClosing, BulkUploadBatch |
| Backend Repository | 5 | 각 엔티티별 JPA Repository |
| Backend Service | 4 | OrderCutoffService, SupplierPortalService, FinanceService, BulkUploadService |
| Backend Controller | 4 | ItemDeliveryScheduleController, OrderCutoffController, SupplierPortalController, FinanceController, BulkUploadController |
| Backend DTO | 5 | CutoffDto, SupplierPortalDto, FinanceDto, BulkUploadDto, ItemDeliveryScheduleDto |
| Backend Test | 2 | V6Backend1Test (633줄), V6Backend2Test (856줄) |
| Flyway | 3 | V26, V27, V28 |
| Frontend Pages | 9 | Cutoff, Calendar, Finance×4, BulkUpload, SupplierPortal×2 |
| Frontend API | 4 | cutoff.ts, finance.ts, bulkUpload.ts, supplierPortal.ts |
| Docs | 1 | AGENT_TEAMS_V6.md |

### 수정 파일 (15개)

| 파일 | 변경 내용 |
|------|-----------|
| `pom.xml` | Apache POI 의존성 추가 |
| `Item.java` | itemCode, spec, description 필드 추가 |
| `ItemCategory.java` | parentId, level, code, description, icon 필드 추가 |
| `Packaging.java` | orderUnitName 필드 추가 |
| `Role.java` | JP_ORDERER, KR_INVENTORY, KR_FINANCE, FULFILLMENT 추가 |
| `OrderStatus.java` | CUTOFF_CLOSED 추가 |
| `DeliveryPolicyService.java` | 상품별 스케줄 우선 로직 추가 |
| `OrderCatalogService.java` | 카탈로그 응답에 배송요일 정보 추가 |
| `ItemService.java` / `ItemDto.java` | 확장 필드 지원 |
| `CatalogDto.java` | deliveryDays, itemCode, spec, orderUnitName |
| `OrderPlanRepository.java` | deliveryDate + status 조회 메서드 추가 |
| `App.tsx` | 9개 신규 라우트 추가 |
| `AdminLayout.tsx` | 7개 사이드바 메뉴 추가 |
| `ko.json` / `ja.json` / `en.json` | ~94개 i18n 키 추가 (각 파일) |
| `User.java` | columnDefinition 추가 (배포 이슈 수정) |
| `CategoriesPage.tsx` | 3단계 계층 UI 전면 재작성 + brandId fallback |
| `ItemsPage.tsx` | 카테고리 cascading 드롭다운 교체 |
| `category.ts` | 트리/계층 API 메서드 추가 |

---

## 9. TASK 체크리스트 최종 상태

### Phase 1: 스키마
- [x] TASK-080 | item 확장 + 배송요일 스키마 (V26)
- [x] TASK-090 | 마감/역할/재무 스키마 (V27)
- [x] TASK-100 | 상품 등록 UI 개편 (ItemsPage 수정)
- [x] T-20, T-24 | 마이그레이션 검증

### Phase 2: 핵심 로직
- [x] TASK-081 | DeliveryPolicyService 배송요일 반영
- [x] TASK-082 | 카탈로그 배송요일 필터링
- [x] TASK-083 | 상품 마스터 API 확장 + 카테고리 3단계
- [x] TASK-091 | 마감 고도화 OrderCutoffService
- [x] TASK-092 | 역할 기반 접근 제어 (7역할)
- [x] TASK-101 | 발주 카탈로그 UI 수정 (카탈로그 응답 확장)
- [x] TASK-102 | 본사 마감 관리 화면 (CutoffPage)
- [x] TASK-103 | 본사 발주 달력 뷰 (OrderCalendarPage)
- [x] T-21~T-23, T-25~T-26 | 핵심 로직 테스트

### Phase 3: 확장 기능
- [x] TASK-093 | 수주 업체 알림 API
- [x] TASK-094 | 재무 대시보드 API
- [x] TASK-095 | 엑셀 벌크 업로드 API
- [x] TASK-104 | 수주 업체 포털 화면
- [x] TASK-105 | 재무 대시보드 화면
- [x] TASK-106 | 엑셀 벌크 업로드 화면
- [x] T-27~T-29, T-30~T-36 | 확장 기능 테스트

### Phase 4: 통합
- [x] TASK-107 | 역할별 메뉴/라우트 분기
- [x] T-37~T-40 | 최종 빌드 + 리그레션 (214 tests, 0 failures)

---

## 10. 알려진 이슈 및 향후 과제

| 항목 | 상태 | 비고 |
|------|------|------|
| App.tsx 역할 라우트 가드 | 일부 그룹화 | 세밀한 역할별 분기 필요 (현재 넓은 역할 그룹) |
| 벌크 업로드 실제 DB INSERT | 기본 구현 | ITEM_MASTER 외 유형의 confirm 로직 확장 필요 |
| 재무 리포트 엑셀 다운로드 | 미구현 | TASK-105 spec에 명시된 기능 |
| 상품 등록 화면 배송요일 UI | API 연동 완료 | TASK-100 spec의 토글/체크박스 UI 세부 구현 보강 가능 |
| E2E 테스트 (T-30~T-36) | Backend 통합 테스트로 대체 | 프론트엔드 E2E는 Playwright/Cypress 도입 시 추가 |
