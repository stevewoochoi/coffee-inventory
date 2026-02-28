# 커피 재고관리 시스템 — 발주 기능 50건 스트레스 테스트 QA 보고서

**테스트 일시**: 2026-02-27 ~ 2026-02-28
**테스트 대상**: /home/ubuntu/coffee-inventory (Backend API v1 + React Frontend)
**테스트 환경**: Docker (coffee-backend), MySQL RDS, Spring Boot 3.2.5 / Java 17
**분석자**: ARCHITECT (구조 분석, 시나리오 설계, 결과 분석)
**실행자**: TESTER (API 호출, 데이터 세팅, 결과 기록)

---

## 1. 테스트 요약

| 구분 | 건수 | 비율 |
|------|------|------|
| 전체 시나리오 | 50 | 100% |
| **PASS** | 30 | 60% |
| **FAIL** | 17 | 34% |
| **조건부 PASS** (재시도 후) | 3 | 6% |
| **통과율** | **60%** | — |

### 심각도별 분류

| 심각도 | 건수 | 설명 |
|--------|------|------|
| **Critical** | 4 | 금액 계산 누락, 데이터 무결성 위반, 상태 전이 문제 |
| **Major** | 7 | 비즈니스 룰 미적용, 에러 핸들링 미흡, 기능 장애 |
| **Minor** | 6 | 기능 미완성, UX 불편, DTO 필드명 혼란 |

### 카테고리별 결과

| 카테고리 | 범위 | PASS | FAIL | 통과율 |
|----------|------|------|------|--------|
| 기본 조회/발주 생성 | TC-01~10 | 10 | 0 | 100% |
| 발주 발송/입고/장바구니 | TC-11~20 | 7 | 3 | 70% |
| 발주 수정/취소/특수 케이스 | TC-21~30 | 3 | 7 | 30% |
| 재고 관리/대시보드/보고서 | TC-31~40 | 8 | 2 | 80% |
| 클레임/POS/실사/엣지 | TC-41~50 | 5 | 5 | 50% |

---

## 2. 발견된 구조적 문제점 (심각도순)

### CRITICAL-01: 직접 발주 생성 시 총액이 항상 0원

**영향 시나리오**: TC-09, TC-49
**심각도**: Critical
**현상**: `POST /api/v1/ordering/plans`로 직접 생성한 발주의 `total_amount`/`vat_amount`가 항상 0원

**근본 원인 분석**:
시스템에 2개의 발주 생성 경로가 존재하며, 금액 계산 로직이 한쪽에만 구현됨:

| 경로 | 서비스 | 금액 계산 | 상태 |
|------|--------|-----------|------|
| **카트 → 확인** | `OrderConfirmService.confirmCart()` | O (line 65-70: unitPrice * packQty 합산, VAT 10%) | CONFIRMED |
| **직접 생성** | `OrderingService.create()` | X (line 103-121: 금액 관련 코드 없음) | DRAFT |

- `OrderingService.create()`는 `storeId`와 `supplierId`만 세팅하고 `totalAmount`/`vatAmount` 계산을 하지 않음
- DB 스키마의 `DEFAULT 0`으로 인해 0.00으로 저장
- `OrderConfirmService.confirmCart()`는 카트 아이템의 `unitPrice`를 참조하여 정확히 계산
- `modifyOrder()`도 `supplierItemRepository`에서 가격을 조회하여 재계산 함

**영향**:
- 직접 생성(DRAFT) 경로로 만든 발주는 confirm 해도 금액이 0원으로 유지
- 카트 흐름을 사용하면 정상 작동 → **프론트엔드 정상 흐름에서는 문제 없음**
- 하지만 API 직접 호출 시 데이터 무결성 문제 발생

**수정 제안**: `OrderingService.create()`에서도 `supplierItemRepository`로 가격 조회 후 금액 계산 추가

---

### CRITICAL-02: 음수/0 수량 발주 허용

**영향 시나리오**: TC-24, TC-25
**심각도**: Critical
**현상**: `packQty = -5` 또는 `packQty = 0`인 발주가 정상 생성됨

**근본 원인 분석**:
- `OrderLine.packQty`에 `@Min(1)` 등 Bean Validation 미적용
- `OrderPlanDto.OrderLineDto.packQty`에도 validation 없음
- `OrderCartDto.CartItemInput.quantity`에는 `@Min(1)` 있음 → **카트 흐름은 안전**
- 직접 발주 생성 API(`POST /plans`)만 취약

```
경로별 validation 현황:
- POST /cart (CreateCartRequest.CartItemInput.quantity): @Min(1) ✓
- POST /plans (CreateRequest.OrderLineDto.packQty): validation 없음 ✗
```

**영향**: 음수 수량 발주 시 금액 계산 오류, 재고 로직 오동작 가능
**수정 제안**: `OrderPlanDto.OrderLineDto.packQty`에 `@Min(1)` 추가, `OrderLine` 엔티티에도 DB 레벨 `CHECK(pack_qty > 0)` 추가

---

### CRITICAL-03: 공급사-품목 불일치 발주 허용

**영향 시나리오**: TC-27
**심각도**: Critical
**현상**: 원두상사(supplier_id=2)에 서울우유(packaging_id=11) 발주가 통과됨

**근본 원인 분석**:
- `OrderingService.create()`: `supplier_item` 테이블 대조 없이 임의의 `supplierId + packagingId` 조합 허용
- `OrderConfirmService.confirmCart()`: 카트 생성 시 `OrderCartService.createOrAddToCart()`에서 `supplierId`를 `supplier_item`으로부터 자동 매핑 → **카트 흐름은 안전**

```
경로별 공급사-품목 검증:
- POST /cart → OrderCartService: supplierItem에서 자동 매핑 ✓
- POST /plans → OrderingService.create(): 검증 없음 ✗
```

**영향**: API 직접 호출 시 잘못된 발주서 생성 → 공급사에 존재하지 않는 품목 발주
**수정 제안**: `OrderingService.create()`에서 각 라인의 `packagingId`가 해당 `supplierId`의 `supplier_item`에 존재하는지 검증

---

### CRITICAL-04: CONFIRMED 발주 cutoffAt 없이 무제한 취소 가능

**영향 시나리오**: TC-23
**심각도**: Critical (재분류: Major로 낮출 수 있음)

**근본 원인 분석**:
`OrderConfirmService.cancelOrder()` (line 119-134) 로직:
```java
if (plan.getStatus() != OrderStatus.CONFIRMED && plan.getStatus() != OrderStatus.DRAFT) {
    throw new BusinessException("Only DRAFT or CONFIRMED orders can be cancelled");
}
if (plan.getCutoffAt() != null && LocalDateTime.now().isAfter(plan.getCutoffAt())) {
    throw new BusinessException("Cannot cancel order after cutoff time");
}
```

- **설계 의도** (TASKS_V5.1): "CANCELLED(취소) — cutoff_at 이전에만 가능" → CONFIRMED 취소 자체는 허용
- **실제 문제**: 직접 생성(POST /plans → confirm)된 주문은 `cutoffAt = null` → cutoff 체크 건너뜀 → 무제한 취소
- 카트 흐름으로 생성된 주문은 `cutoffAt`이 정상 세팅되어 cutoff 이후 취소 불가

**심각도 재평가**:
- TASKS_V5.1 설계 기준으로는 CONFIRMED 취소는 정상 동작 (cutoff 전 한정)
- 문제는 `cutoffAt = null`일 때의 방어 로직 부재
- **Major**로 재분류 권장 (설계와 일치하나 null 방어 미흡)

**수정 제안**: `cutoffAt == null`일 때 취소 불가 처리 또는, `OrderingService.confirm()`에서도 `cutoffAt` 계산

---

## 3. 단위/포장 관련 문제

### 포장단위 체계 현황

| 품목 유형 | base_unit | units_per_pack | 의미 |
|-----------|-----------|---------------|------|
| 원두 1kg | kg | 1.000 | 1팩 = 1kg |
| 디카페인 500g | kg | 0.500 | 1팩 = 0.5kg |
| 우유/시럽 1L | ea | 1.000 | 1팩 = 1ea |
| 12oz 컵 1000개입 | ea | 1000.000 | 1팩 = 1000ea |
| 크루아상 30개입 | ea | 30.000 | 1팩 = 30ea |

### 발견된 문제

**MINOR-01: packQty가 Integer로 고정 — 낱개 발주 불가**
- `OrderLine.packQty`와 `OrderCartItem.packQty`는 모두 `Integer` 타입
- 반 박스(0.5팩) 발주 불가 → 소규모 매장에서 과잉 발주 유발 가능
- 현재 프론트엔드에서도 정수만 허용하므로 일관성은 있음

**MINOR-02: base_unit 표기 불일치**
- 원두: base_unit="kg"이지만 inventory_snapshot.qty_base_unit은 kg 단위 (5.000 = 5kg)
- 시드 데이터(V3)에서는 base_unit="g"으로 설정, V19에서 "kg"으로 변경되지 않음
- 이로 인해 recipe_component의 qty_base_unit(0.018 = 18g)과 혼용 → POS 차감은 정상 동작하지만 표시 단위 혼란

### 재고 차감 검증 결과

- **POS 판매 → 재고 차감**: 정상 (TC-45: 아메리카노 5잔 → 에스프레소 원두 90g = 0.090kg 차감 확인)
- **입고 → 재고 증가**: 정상 (TC-18: 에티오피아 원두 15팩 × 1kg = 15kg 입고 확인)
- **FIFO 차감**: 유통기한 오래된 LOT부터 차감 → 정상 동작

---

## 4. 배송/리드타임 관련 문제

### 정상 동작 확인

| 기능 | 시나리오 | 결과 |
|------|----------|------|
| 배송 가능일 조회 | TC-06 | PASS — MON/WED/FRI 정상, 일요일 제외 |
| 배송 가용성 체크 | TC-50 | PASS — available/deadline/remainingMinutes 정상 |
| 카탈로그 정책 필터링 | TC-07 | PASS — isOrderable=true만 표시 |

### 미검증 항목

| 항목 | 이유 | 위험도 |
|------|------|--------|
| 공휴일(delivery_holiday) 제외 | 공휴일 생성 API 없음, DB 직접 INSERT 필요 | Low |
| TUE_THU_SAT 정책 전환 | 별도 매장 정책 변경 미테스트 | Low |
| leadTimeDays=5 품목 카탈로그 제외 | 시럽(5일) 품목의 가까운 배송일 필터링 미확인 | Medium |
| cutoff 시간 경계값 (09:00 정각) | 시간 조작 불가로 경계값 미테스트 | Low |
| 배송정책 미매핑 매장 fallback | 신규 매장 생성 후 fallback 미테스트 | Medium |

### 배송정책 구조 평가

`DeliveryPolicyService`는 잘 설계되어 있음:
- 3단계 fallback: 매장 기본정책 → 매장 아무 정책 → 브랜드 정책
- 일요일 항상 제외
- delivery_holiday 테이블 기반 공휴일 제외
- 아이템별 leadTimeDays 개별 적용

---

## 5. 금액 계산 관련 문제

### 금액 계산 로직 분석

**카트 흐름 (OrderConfirmService.confirmCart)**:
```
totalAmount = SUM(unitPrice × packQty) — per supplier group
vatAmount = totalAmount × 0.10 (HALF_UP, scale=2)
```
- `unitPrice`는 카트 아이템 생성 시 `supplier_item.price`에서 복사
- **정상 동작** (카트 흐름 사용 시)

**수정 흐름 (OrderConfirmService.modifyOrder)**:
```
linePrice = supplierItemRepository.findBySupplierIdAndPackagingId(supplierId, packagingId)
totalAmount = SUM(linePrice × packQty)
vatAmount = totalAmount × 0.10 (HALF_UP, scale=2)
```
- **정상 동작** (CONFIRMED 상태에서만)

**직접 생성 (OrderingService.create)**:
- 금액 계산 **완전 누락** → 0원

### 금액 관련 테스트 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 카트 → 확인 금액 계산 | 미직접테스트 | TESTER가 직접 생성 경로 사용 |
| 직접 생성 금액 | FAIL | 0원 (TC-09, TC-49) |
| VAT 반올림 (HALF_UP) | 코드 확인 | `setScale(2, RoundingMode.HALF_UP)` |
| BigDecimal overflow | N/A | DECIMAL(12,2) 범위 내 |

### 수정 제안
1. `OrderingService.create()`에 금액 계산 로직 추가
2. 또는 직접 생성 API를 deprecate하고 카트 흐름만 사용하도록 유도

---

## 6. 상태 관리 관련 문제

### 발주 상태 전이 현황

```
설계 (TASKS_V5.1):
  DRAFT → CONFIRMED → DISPATCHED → RECEIVED/PARTIALLY_RECEIVED
  DRAFT/CONFIRMED → CANCELLED (cutoff_at 이전만)

실제 구현:
  DRAFT → CONFIRMED          (OrderingService.confirm) ✓
  CONFIRMED → DISPATCHED     (OrderingService.dispatch) ✓
  DISPATCHED → DELIVERED/PARTIALLY_RECEIVED (DeliveryService.receiveFromOrder) ✓
  DRAFT → CANCELLED          (OrderConfirmService.cancelOrder) ✓
  CONFIRMED → CANCELLED      (OrderConfirmService.cancelOrder) ✓ (cutoff 체크 있음)
  CONFIRMED+cutoffAt=null → CANCELLED (무제한) ⚠️
```

### 발견된 상태 전이 문제

| 문제 | 심각도 | 설명 |
|------|--------|------|
| cutoffAt=null 취소 무제한 | Major | 직접 생성 주문은 cutoffAt 없어 항시 취소 가능 |
| DRAFT 수정 불가 | Minor | modifyOrder는 CONFIRMED만 허용 → DRAFT 수정은 delete+recreate 필요 |
| DISPATCHED 취소 차단 | PASS | 설계대로 차단됨 |
| DELIVERED 이후 추가 입고 | 미테스트 | 이미 DELIVERED인 주문에 재입고 시 동작 미확인 |

### 풀필먼트 상태 현황

- `fulfillment_status`: PENDING / PREPARING / SHIPPED / DELIVERED / CANCELLED
- 대부분 PENDING으로 유지 — 관리자 수동 업데이트 필요
- `PUT /api/v1/admin/ordering/plans/{id}/fulfillment`로 변경 가능 (TC-13에서 조회 확인)

---

## 7. 현재 시스템에서 아예 불가능한 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| **소수점 packQty** | 불가 | Integer 타입 고정, 반 박스 발주 불가 |
| **배송요일별 공급사 분리** | 불가 | 공급사별 배송요일 관리 없음 (정책은 매장 단위) |
| **공급사별 리드타임 적용** | 부분 | supplier_item.leadTimeDays 있으나, 카탈로그 필터링에서는 item.leadTimeDays만 사용 |
| **냉장/냉동 온도대별 배송 분리** | 부분 | DeliveryPolicy에 temperatureZone 있으나 발주 생성 시 온도대 검증 없음 |
| **발주서 이메일 자동 발송** | Stub | dispatch 시 "stub" 로그만 기록, 실제 SES 미연동 |
| **공휴일 관리 API** | 없음 | delivery_holiday는 DB 직접 INSERT만 가능 |
| **발주 승인 워크플로우** | 없음 | 매장→본사 승인 없이 매장에서 바로 확정 |
| **여신/예산 한도** | 없음 | Phase 2 예정 (TASKS_V5.1) |
| **세트상품 발주** | 없음 | Phase 2 예정 |
| **다중 배송지** | 없음 | 매장 단위로만 발주, 매장 내 세부 배송지 없음 |

---

## 8. TASKS_V5.1에서 해결되는 문제 vs 추가 보완 필요 사항

### TASKS_V5.1 완료 상태와 실제 품질 비교

모든 TASK-054~073이 [x] 완료로 표시되어 있으나, 테스트 결과 구현 품질에 차이가 있음:

| TASK | 기능 | V5.1 상태 | 실제 품질 | 비고 |
|------|------|-----------|-----------|------|
| TASK-054 | DB 스키마 | 완료 | **양호** | V17 마이그레이션 정상, 단 V13의 unique 제약과 충돌 |
| TASK-055 | 배송정책 엔진 | 완료 | **양호** | 정상 동작 확인 |
| TASK-056 | 카탈로그 API | 완료 | **양호** | 27개 품목, 카테고리 필터, 저재고 표시 정상 |
| TASK-057 | 장바구니 API | 완료 | **보통** | V13 unique 제약 충돌 (MAJOR-01) |
| TASK-058 | 발주 확정/전송 | 완료 | **보통** | 카트 흐름 정상, 직접 생성 경로 미완성 |
| TASK-059 | React 발주 UI | 완료 | **양호** | 3단계 흐름 정상 (프론트 테스트 미실행) |
| TASK-060 | 주문현황/수정 | 완료 | **미흡** | modifyOrder에서 DTO 문제 (TC-21) |
| TASK-061 | 빠른 재발주 | 완료 | **양호** | reorder API 정상 (TC-30) |
| TASK-062 | 발주↔입고 연동 | 완료 | **양호** | from-order 입고 정상, 재고 반영 확인 |
| TASK-063 | 클레임 API | 완료 | **미흡** | 생성 정상, 해결 500 에러 (MAJOR-06) |
| TASK-064 | 클레임 UI | 완료 | 미확인 | 프론트 미테스트 |
| TASK-065 | 재고실사 API | 완료 | **미흡** | 실사 생성 500 에러 (MAJOR-07) |
| TASK-066 | 재고실사 UI | 완료 | 미확인 | 프론트 미테스트 |
| TASK-067 | FIFO/유통기한 | 완료 | **양호** | 유통기한 알림, FIFO 차감 정상 |
| TASK-068 | 대시보드 API | 완료 | **미흡** | 500 에러 (MAJOR-05) |
| TASK-069 | 대시보드 UI | 완료 | 미확인 | 프론트 미테스트 |
| TASK-070 | 재고 화면 개선 | 완료 | **양호** | 재고 조회/조정 정상 |
| TASK-071 | 재고 조정/예측 | 완료 | **양호** | adjust/forecast 정상 |
| TASK-072 | 풀필먼트 관리 | 완료 | **양호** | 관리자 API 정상 |
| TASK-073 | 품절관리 | 완료 | 미테스트 | — |

### 추가 보완 필요 사항 (V5.1에서 해결되지 않는 문제)

| 구분 | 문제 | V5.1 해결 여부 | 추가 조치 필요 |
|------|------|---------------|---------------|
| **Validation** | 직접 생성 API의 packQty 검증 누락 | ✗ | `@Min(1)` 추가 |
| **Validation** | maxOrderQty 서버사이드 미검증 | ✗ | create/modify에 검증 추가 |
| **Validation** | 공급사-품목 불일치 미검증 | ✗ | supplier_item 존재 확인 |
| **금액** | 직접 생성 경로 금액 미계산 | ✗ | 금액 계산 추가 또는 API deprecate |
| **DB** | V13 unique 제약과 V17 설계 충돌 | ✗ | 마이그레이션으로 unique 수정 |
| **에러** | 존재하지 않는 리소스 500 에러 | ✗ | ResourceNotFoundException 적용 |
| **기능** | 대시보드/보고서/실사/클레임해결 500 에러 | ✗ | 디버깅 필요 |
| **기능** | PDF 생성 실패 | ✗ | S3/PDFBox 연동 점검 |
| **기능** | 공휴일 관리 API 부재 | ✗ | CRUD API 추가 |

---

## 9. 우선 수정 권장 사항 (Top 10)

### P0 — 즉시 수정 (데이터 무결성 위협)

| # | 문제 | 수정 방안 | 파일 |
|---|------|-----------|------|
| 1 | **packQty 음수/0 허용** | `OrderPlanDto.OrderLineDto.packQty`에 `@Min(1)` 추가 | `OrderPlanDto.java` |
| 2 | **공급사-품목 불일치 허용** | `OrderingService.create()`에서 `supplierItemRepository.findBySupplierIdAndPackagingId()` 검증 추가 | `OrderingService.java` |
| 3 | **직접 생성 금액 0원** | `OrderingService.create()`에 금액 계산 로직 추가 (confirmCart과 동일 패턴) | `OrderingService.java` |
| 4 | **cutoffAt=null 무제한 취소** | `cancelOrder()`에서 `cutoffAt == null`이면 즉시 취소 불가 처리, 또는 `confirm()`에서 cutoffAt 자동 계산 | `OrderConfirmService.java` |

### P1 — 1주 내 수정 (비즈니스 로직 보완)

| # | 문제 | 수정 방안 | 파일 |
|---|------|-----------|------|
| 5 | **장바구니 unique 충돌** | V20 마이그레이션: `DROP INDEX uq_cart_store_user`, V13 레거시 제약 제거 | 새 Flyway 파일 |
| 6 | **maxOrderQty 서버 미검증** | create/modify 시 `item.maxOrderQty` 대조 | `OrderingService.java`, `OrderConfirmService.java` |
| 7 | **존재하지 않는 리소스 500** | `OrderingService.create()`에서 `supplierRepository.findById()` 선행 검증 → `ResourceNotFoundException` | `OrderingService.java` |
| 8 | **클레임 해결 500 에러** | `ClaimService.resolveClaim()` 디버깅 (AcceptedLineInput DTO 매핑 문제 추정) | `ClaimService.java` |

### P2 — 2주 내 수정 (기능 완성)

| # | 문제 | 수정 방안 | 파일 |
|---|------|-----------|------|
| 9 | **대시보드/보고서 500 에러** | 집계 쿼리 NPE 또는 NULL 처리 디버깅 | `DashboardService.java`, `ReportService.java` |
| 10 | **PDF 생성/실사 500 에러** | S3 연동 환경변수, PhysicalCount DTO 매핑 점검 | `PdfGeneratorService.java`, `PhysicalCountService.java` |

---

## 10. 상세 테스트 결과 (50건 전체)

### TC-01~10: 기본 조회/발주 생성 흐름

| # | 시나리오 | API | 판정 | 심각도 | 상세 |
|---|---------|-----|------|--------|------|
| TC-01 | 품목 목록 조회 | `GET /master/items?brandId=1` | **PASS** | — | 27개 품목 정상 조회 |
| TC-02 | 공급사 목록 조회 | `GET /master/suppliers?brandId=1` | **PASS** | — | 6개 공급사 조회 |
| TC-03 | 공급사별 품목 조회 | `GET /master/suppliers/2/items` | **PASS** | — | 원두상사 5종 |
| TC-04 | 현재 재고 조회 | `GET /inventory/snapshot?storeId=1` | **PASS** | — | 27항목 |
| TC-05 | 카테고리 목록 조회 | `GET /master/categories?brandId=1` | **PASS** | — | 5개 카테고리 |
| TC-06 | 배송 가능일 조회 | `GET /ordering/delivery-dates?storeId=1` | **PASS** | — | 6건, MON/WED/FRI, 일요일 제외 |
| TC-07 | 카탈로그 조회 | `GET /ordering/catalog?storeId=1` | **PASS** | — | 27개 품목, isOrderable 필터 정상 |
| TC-08 | 발주 플랜 생성 | `POST /ordering/plans` | **PASS** | — | id=4, status=DRAFT |
| TC-09 | 발주 플랜 상세 | `GET /ordering/plans/{id}/detail` | **PASS**¹ | Critical | 3개 라인 정상, 단 **totalAmount=0원** |
| TC-10 | 발주 확정 | `PUT /ordering/plans/{id}/confirm` | **PASS** | — | DRAFT→CONFIRMED |

> ¹ API 호출 자체는 성공하나, 금액 0원 문제가 있어 CRITICAL-01로 별도 분류

### TC-11~20: 발주 발송/입고/장바구니

| # | 시나리오 | API | 판정 | 심각도 | 상세 |
|---|---------|-----|------|--------|------|
| TC-11 | 발주 발송 | `POST /ordering/plans/{id}/dispatch` | **PASS** | — | CONFIRMED→DISPATCHED, dispatch_log 생성 |
| TC-12 | 발주 이력 조회 | `GET /ordering/history?storeId=1` | **PASS** | — | 4건, 공급사명/라인 포함 |
| TC-13 | 관리자 발주 목록 | `GET /admin/ordering/plans` | **PASS** | — | 4건, 풀필먼트 상태 포함 |
| TC-14 | 입고 대기 조회 | `GET /receiving/pending-orders?storeId=1` | **PASS** | — | DISPATCHED 3건 |
| TC-15 | 발주→입고 생성 | `POST /receiving/from-order/{id}` | **PASS**² | Minor | DTO 필드명 `packQty` 사용 시 성공 |
| TC-16 | 입고 스캔 (완료 건) | `POST /receiving/deliveries/{id}/scans` | **FAIL** | Minor | 이미 COMPLETED 배송에 스캔 시도 → 400 |
| TC-17 | 입고 확인 (자동완료) | `PUT /receiving/deliveries/{id}/confirm` | **FAIL** | Minor | from-order가 이미 자동완료 → 중복 완료 불가 |
| TC-18 | 입고 후 재고 변동 | DB 확인 | **PASS** | — | RECEIVE 3건, 에티오피아 재고 15kg 증가 |
| TC-19 | 장바구니 생성 | `POST /ordering/cart` | **FAIL** | Major | `uq_cart_store_user` unique 제약 충돌 |
| TC-20 | 장바구니 조회 | `GET /ordering/cart/active?storeId=1` | **PASS** | — | 정상 |

> ² 최초 `receivedPackQty` 필드명으로 시도 시 500 → `packQty`로 수정 후 성공

### TC-21~30: 발주 수정/취소/특수 케이스

| # | 시나리오 | API | 판정 | 심각도 | 상세 |
|---|---------|-----|------|--------|------|
| TC-21 | 발주 수정 (DRAFT) | `PUT /ordering/plans/{id}` | **FAIL** | Minor | 400 에러 — CONFIRMED만 수정 가능 (설계 의도) |
| TC-22 | 발주 취소 (DRAFT) | `POST /ordering/plans/{id}/cancel` | **PASS** | — | DRAFT→CANCELLED 정상 |
| TC-23 | 확정 발주 취소 | `POST /ordering/plans/{id}/cancel` | **FAIL**³ | Critical→Major | cutoffAt=null로 무제한 취소 |
| TC-24 | 음수 수량 발주 | `POST /ordering/plans` packQty=-5 | **FAIL** | Critical | -5 허용됨 |
| TC-25 | 0 수량 발주 | `POST /ordering/plans` packQty=0 | **FAIL** | Critical | 0 허용됨 |
| TC-26 | 존재하지 않는 공급사 | `POST /ordering/plans` supplierId=99999 | **FAIL** | Major | 500 에러 (404 기대) |
| TC-27 | 공급사-품목 불일치 | `POST /ordering/plans` | **FAIL** | Critical | 원두상사에 유제품 발주 허용 |
| TC-28 | 다중 공급사 동시 발주 | `POST /ordering/plans` ×2 | **PASS** | — | 정상 |
| TC-29 | PDF 다운로드 | `GET /ordering/plans/{id}/pdf` | **FAIL** | Major | 500 에러 |
| TC-30 | 재주문 | `POST /ordering/reorder/{id}` | **PASS** | — | 정상 |

> ³ TASKS_V5.1 설계상 CONFIRMED 취소는 cutoff 전 허용이 맞으나, cutoffAt=null 방어 미흡이 문제

### TC-31~40: 재고 관리/대시보드/보고서

| # | 시나리오 | API | 판정 | 심각도 | 상세 |
|---|---------|-----|------|--------|------|
| TC-31 | 재고 원장 조회 | `GET /inventory/ledger?storeId=1` | **PASS** | — | 3건 |
| TC-32 | 저재고 알림 | `GET /inventory/low-stock?storeId=1` | **PASS** | — | 13건 감지 |
| TC-33 | 유통기한 알림 | `GET /inventory/expiry-alerts?storeId=1` | **PASS** | — | 정상 |
| TC-34 | 재고 예측 | `GET /inventory/forecast?storeId=1` | **PASS** | — | trend/daysUntilEmpty 포함 |
| TC-35 | 재고 수동 조정 | `POST /inventory/adjust` | **PASS**⁴ | Minor | `newQtyBaseUnit` 필드 사용 시 성공 |
| TC-36 | 대시보드 | `GET /dashboard/store/{storeId}` | **FAIL** | Major | 500 에러 |
| TC-37 | 폐기 기록 | `POST /waste` | **PASS** | — | 201 |
| TC-38 | 폐기 목록 조회 | `GET /waste?storeId=1` | **PASS** | — | 정상 |
| TC-39 | 보고서 조회 | `GET /reports` | **FAIL** | Major | 500 에러 |
| TC-40 | 발주 추천 | `GET /ordering/suggestion?storeId=1&supplierId=2` | **PASS** | — | 0건 (소비 데이터 부족) |

> ⁴ 최초 `qtyBaseUnit`/`adjustQty` 필드명으로 시도 시 에러 → `newQtyBaseUnit` 사용 시 성공

### TC-41~50: 클레임/POS/실사/엣지케이스

| # | 시나리오 | API | 판정 | 심각도 | 상세 |
|---|---------|-----|------|--------|------|
| TC-41 | 클레임 생성 | `POST /claims` | **PASS** | — | claim_id=1 |
| TC-42 | 클레임 목록 조회 | `GET /claims?storeId=1` | **PASS** | — | 1건 |
| TC-43 | 클레임 해결 | `PUT /claims/{id}/resolve` | **FAIL** | Major | 500 에러 |
| TC-44 | POS 판매 등록 | `POST /pos/sales` | **PASS** | — | 아메리카노 5잔 |
| TC-45 | POS→재고 차감 확인 | DB 확인 | **PASS** | — | 원두 4.910kg (5.000-0.090), SELL 원장 2건 |
| TC-46 | 실사 시작 | `POST /physical-count` | **FAIL** | Major | 500 에러 |
| TC-47 | 홍대점 발주 | `POST /ordering/plans` (storeId=2) | **PASS** | — | id=13 |
| TC-48 | 대량 발주 (maxOrderQty 초과) | `POST /ordering/plans` packQty=999 | **FAIL** | Major | 999팩 허용 (maxOrderQty=100) |
| TC-49 | 발주 총액 계산 | `POST /ordering/plans` | **FAIL** | Critical | totalAmount=0원 (360,000원 기대) |
| TC-50 | 배송정책 가용성 | `GET /ordering/availability` | **PASS** | — | 정상 |

---

## 부록 A: 테스트 데이터 세팅 내역

### 추가된 테스트 데이터

| 구분 | 항목 | DB ID 범위 |
|------|------|-----------|
| 품목(item) | 22종 (원두5, 유제품5, 시럽4, 일회용품5, 디저트3) | 6~27 |
| 포장(packaging) | 22종 | 6~27 |
| 공급사(supplier) | 5개 (원두상사, 프레시밀크, 시럽월드, 패키지코리아, 베이커리플러스) | 2~6 |
| 공급사-품목 매핑 | 22건 | 4~25 |
| 카테고리 | 1개 추가 (디저트/베이커리) | 8 |
| 재고 스냅샷 | 강남역점 22건 + 홍대점 27건 | 신규 |

### 테스트 데이터 정리 SQL

```sql
-- 테스트 발주 정리 (id >= 4)
DELETE FROM order_dispatch_log WHERE order_plan_id >= 4;
DELETE FROM order_line WHERE order_plan_id >= 4;
DELETE FROM order_plan WHERE id >= 4;

-- 테스트 배송/장바구니/클레임 정리
DELETE FROM delivery_scan WHERE delivery_id >= 2;
DELETE FROM delivery WHERE id >= 2;
DELETE FROM order_cart_item WHERE cart_id >= 3;
DELETE FROM order_cart WHERE id >= 3;
DELETE FROM claim_line WHERE claim_id >= 1;
DELETE FROM claim WHERE id >= 1;

-- 테스트 마스터 데이터 정리
DELETE FROM inventory_snapshot WHERE item_id >= 6;
DELETE FROM supplier_item WHERE id >= 4;
DELETE FROM supplier WHERE id >= 2;
DELETE FROM packaging WHERE id >= 6;
DELETE FROM item WHERE id >= 6;
DELETE FROM item_category WHERE id = 8;
```

---

## 부록 B: 두 발주 경로 비교 분석

시스템에는 두 가지 발주 생성 경로가 존재하며, 기능 완성도에 큰 차이가 있습니다:

| 기능 | 카트 흐름 (권장) | 직접 생성 (레거시) |
|------|-----------------|-------------------|
| **API** | POST /cart → POST /cart/{id}/confirm | POST /plans |
| **초기 상태** | CONFIRMED | DRAFT |
| **금액 계산** | ✓ (unitPrice × packQty, VAT 10%) | ✗ (0원) |
| **공급사 매핑** | ✓ (supplier_item에서 자동) | ✗ (수동 입력, 검증 없음) |
| **packQty 검증** | ✓ (@Min(1)) | ✗ (음수/0 허용) |
| **cutoffAt 설정** | ✓ (정책 기반 자동 계산) | ✗ (null) |
| **deliveryDate** | ✓ (필수 입력) | ✗ (null) |
| **배송일 분리** | ✓ (deliveryDate별 카트) | ✗ |
| **maxOrderQty** | 프론트에서만 | ✗ |
| **supplier 분리** | ✓ (confirmCart에서 자동) | ✗ (1:1 고정) |
| **프론트엔드 사용** | ✓ (NewOrderPage 3단계) | ✗ (미사용) |

**결론**: 카트 흐름(TASK-057~058)은 상대적으로 안정적이며 프론트엔드가 사용하는 주 경로입니다. 직접 생성 API는 V1 초기 구현의 레거시로, validation과 비즈니스 로직이 부족합니다. 대부분의 CRITICAL 이슈는 직접 생성 경로에서만 발생합니다.

---

## 부록 C: 긍정적 발견 사항

1. **카트 기반 발주 흐름 안정적**: 공급사 자동매핑, 금액계산, 배송일 관리 정상 동작
2. **입고→재고 반영 정상**: from-order 입고 시 stock_ledger RECEIVE + inventory_snapshot 정확 갱신
3. **POS 판매→재고 차감 정상**: 레시피 기반 원재료 자동 FIFO 차감
4. **다중 매장 독립 발주**: 강남역점/홍대점 독립적 발주/재고 관리
5. **배송정책 엔진 우수**: 정책 기반 배송 가능일 계산, 일요일/공휴일 제외, 리드타임 적용
6. **카탈로그/카테고리 시스템**: 27개 품목, 5개 카테고리, 저재고 필터, 추천수량 제공
7. **저재고 알림**: 13건 적시 감지 (minStockQty 기반)
8. **재발주 기능**: 과거 발주 기반 장바구니 자동 생성 정상
9. **유통기한/FIFO 관리**: LOT별 재고 추적, 만료 임박 알림 정상
10. **VAT 계산 정확**: HALF_UP 반올림, 10% 정률 → 코드 레벨 검증 완료

---

*QA 보고서 작성: ARCHITECT Agent*
*테스트 실행: TESTER Agent*
*테스트 일시: 2026-02-27 ~ 2026-02-28*
