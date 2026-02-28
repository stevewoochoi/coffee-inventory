# AGENT_TEAMS_FIX.md — QA 보고서 기반 시스템 개선 (4인 팀)

---

## 1. settings.json (이미 설정 완료라면 건너뛰기)

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
      "Bash(*)"
    ]
  }
}
```

---

## 2. 실행 프롬프트

Claude Code 터미널에 붙여넣기:

```
QA 스트레스 테스트(docs/QA_REPORT.md)에서 발견된 17건 FAIL + 구조적 문제를 4인 팀으로 수정해줘.

프로젝트: /home/ubuntu/coffee-inventory
스택: Spring Boot 3 + JPA + Flyway + MySQL + React + Tailwind + shadcn/ui
API 패턴: ApiResponse<T>, /api/v1/

먼저 docs/QA_REPORT.md를 정독하고 프로젝트 전체 구조를 파악해.

=== 4명 팀 구성 ===

■ ARCHITECT (기획/조율) — delegate mode, 코드 직접 작성 X
역할: 수정 우선순위 결정, 설계, 코드 리뷰, 품질 관리

시작 작업:
1. docs/QA_REPORT.md 정독 (50건 테스트, 17건 FAIL, Critical 4건, Major 7건, Minor 6건)
2. 프로젝트 구조 파악:
   - src/main/java 패키지, 엔티티, 서비스, 컨트롤러
   - src/main/resources/db/migration Flyway 최신 버전 확인
   - frontend/src 구조
3. QA에서 발견된 핵심 파일 분석:
   - OrderingService.java (직접 생성 경로 — CRITICAL-01,02,03 관련)
   - OrderConfirmService.java (카트 흐름 + 취소 — CRITICAL-04 관련)
   - OrderPlanDto.java (Validation 누락)
   - OrderCartService.java (unique 제약 충돌 — MAJOR-01)
   - ClaimService.java (해결 500 에러 — MAJOR-06)
   - DashboardService.java (500 에러 — MAJOR-05)
   - PhysicalCountService.java (실사 500 에러 — MAJOR-07)
   - ReportService.java (보고서 500 에러)
   - PdfGeneratorService.java (PDF 생성 500 에러)

수정 전략 결정:
- 직접 생성 API(POST /plans)를 강화할지, deprecate할지 판단
  → QA 결론: "카트 흐름이 주 경로이고, 직접 생성은 레거시"
  → 권장: 직접 생성 API에도 동일 수준 validation/금액계산 추가 (API 호환성 유지)
- 각 수정이 기존 카트 흐름에 영향 없는지 확인

각 팀메이트에게 전달할 것:
- BACKEND: 수정할 파일, 메서드, 정확한 수정 내용
- FRONTEND: 수정 필요한 화면/컴포넌트
- TESTER: 수정 완료 후 재테스트할 TC 목록

진행 중:
- 각 팀메이트 plan 검토 후 승인/반려
- 완료된 코드 리뷰 (기존 카트 흐름 깨짐 없는지 특히 주의)
- 매 FIX 완료 시 git commit
- 전체 완료 시 git push

■ BACKEND — 백엔드 버그 수정 + 기능 보강

=== P0: 즉시 수정 (Critical 4건) ===

FIX-01: packQty 음수/0 허용 수정 (CRITICAL-02, TC-24,25)
  파일: OrderPlanDto.java, OrderLine.java
  수정:
  - OrderPlanDto.CreateRequest.OrderLineDto.packQty에 @Min(1) @NotNull 추가
  - OrderLine 엔티티에 @Min(1) 추가
  - Flyway 새 버전: ALTER TABLE order_line ADD CHECK (pack_qty > 0)
  주의: OrderCartDto.CartItemInput.quantity는 이미 @Min(1) 있음 — 건드리지 X

FIX-02: 공급사-품목 불일치 수정 (CRITICAL-03, TC-27)
  파일: OrderingService.java
  수정: create() 메서드에서 각 라인의 packagingId가 해당 supplierId의 supplier_item에 존재하는지 검증
  패턴: supplierItemRepository.findBySupplierIdAndPackagingId(supplierId, packagingId)
        .orElseThrow(() -> new BusinessException("해당 공급사에 등록되지 않은 품목입니다"))
  주의: confirmCart()는 이미 자동매핑이라 수정 불필요

FIX-03: 직접 생성 금액 0원 수정 (CRITICAL-01, TC-09,49)
  파일: OrderingService.java
  수정: create() 메서드에 금액 계산 추가
  패턴: confirmCart()의 금액 계산 로직 참고
    - 각 라인: supplierItemRepository에서 price 조회 → unitPrice 세팅
    - totalAmount = SUM(unitPrice × packQty)
    - vatAmount = totalAmount × 0.10 (HALF_UP, scale=2)
  주의: confirmCart()과 modifyOrder()의 기존 계산 로직을 공통 메서드로 추출 권장

FIX-04: cutoffAt=null 무제한 취소 수정 (CRITICAL-04, TC-23)
  파일: OrderConfirmService.java
  수정: cancelOrder()에서 cutoffAt == null이면 취소 불가 처리
  또는: OrderingService.confirm()에서도 cutoffAt 자동 계산 (DeliveryPolicyService 활용)
  추가: 직접 생성 confirm 시에도 cutoffAt, deliveryDate 세팅

=== P1: 1주 내 수정 (Major 7건) ===

FIX-05: 장바구니 unique 충돌 수정 (MAJOR-01, TC-19)
  파일: 새 Flyway 마이그레이션 V20__fix_cart_unique.sql (또는 다음 버전)
  수정: V13의 레거시 unique 제약 DROP
    DROP INDEX uq_cart_store_user ON order_cart;
  주의: 기존 V17 설계의 UNIQUE KEY (store_id, delivery_date, status)는 유지

FIX-06: maxOrderQty 서버 미검증 수정 (MAJOR-02, TC-48)
  파일: OrderingService.java, OrderConfirmService.java
  수정:
  - create(): 각 라인의 packQty가 해당 item.maxOrderQty 이하인지 검증
  - modifyOrder(): 동일 검증 추가
  - confirmCart(): 카트 → 발주 확정 시에도 검증 추가
  에러: BusinessException("최대 발주 수량(X)을 초과했습니다")

FIX-07: 존재하지 않는 리소스 500 → 404 (MAJOR-03, TC-26)
  파일: OrderingService.java (그 외 필요한 서비스)
  수정: supplierRepository.findById(), itemRepository.findById() 등에서
        .orElseThrow(() -> new ResourceNotFoundException("Supplier", id))
  확인: ResourceNotFoundException이 이미 있는지, 없으면 생성
        GlobalExceptionHandler에서 404 매핑 확인

FIX-08: 클레임 해결 500 에러 수정 (MAJOR-06, TC-43)
  파일: ClaimService.java
  분석: resolveClaim()에서 AcceptedLineInput DTO 매핑 문제 추정
  수정: DTO 필드명 확인, null 방어, 디버깅 후 수정

FIX-09: 대시보드 500 에러 수정 (MAJOR-05, TC-36)
  파일: DashboardService.java
  분석: 집계 쿼리에서 NPE 또는 NULL 처리 문제 추정
  수정: COALESCE 적용 또는 null 방어

FIX-10: 재고실사 500 에러 수정 (MAJOR-07, TC-46)
  파일: PhysicalCountService.java
  분석: DTO 매핑 또는 snapshot 조회 문제 추정
  수정: 디버깅 후 수정

FIX-11: 보고서/PDF 500 에러 수정 (MAJOR, TC-29,39)
  파일: ReportService.java, PdfGeneratorService.java
  분석: S3 환경변수 미설정 또는 PDFBox 의존성 문제
  수정: S3 비활성화 시 로컬 파일 fallback, 또는 환경변수 세팅

=== P2: 추가 보강 ===

FIX-12: DRAFT 상태 수정 지원 (MINOR, TC-21)
  파일: OrderConfirmService.java
  수정: modifyOrder()에서 CONFIRMED뿐 아니라 DRAFT도 수정 가능하도록

FIX-13: 입고 완료 건 중복 스캔 방어 (MINOR, TC-16,17)
  파일: DeliveryService.java (또는 ReceivingService)
  수정: COMPLETED 상태 배송에 스캔/확인 시 명확한 400 에러 메시지

FIX-14: 공휴일 관리 CRUD API (미구현)
  파일: 새 DeliveryHolidayController, DeliveryHolidayService
  API:
  - GET /api/v1/admin/delivery-holidays?brandId={id}
  - POST /api/v1/admin/delivery-holidays
  - DELETE /api/v1/admin/delivery-holidays/{id}

규칙:
- 매 FIX 시작 전 ARCHITECT에게 plan → 승인 후 구현
- FIX-01~04 (P0)를 반드시 먼저 완료
- 기존 카트 흐름(confirmCart, modifyOrder)의 정상 동작을 절대 깨뜨리지 않기
- 금액 계산 공통 메서드 추출 시 기존 메서드의 동작 변경 X
- 매 FIX 완료 후 TESTER에게 알림

■ FRONTEND — 프론트엔드 보강

FIX-F01: 발주 생성 화면 Validation 강화
  파일: NewOrderPage 또는 발주 관련 컴포넌트
  수정:
  - 수량 입력 시 0 이하 입력 불가 (min=1 강제)
  - maxOrderQty 초과 시 경고 표시
  - 공급사-품목 불일치 조합이 UI에서 발생하지 않도록 (이미 카트 흐름이면 문제 없을 수 있음 — 확인)

FIX-F02: 대시보드 500 에러 방어
  파일: Dashboard 컴포넌트
  수정: API 500 에러 시 "데이터를 불러올 수 없습니다" fallback UI 표시 (빈 화면 방지)

FIX-F03: 클레임 해결 화면 점검
  파일: 클레임 관련 컴포넌트
  수정: 해결 API 호출 시 DTO 필드명이 백엔드와 일치하는지 확인, 에러 핸들링

FIX-F04: 재고실사 화면 점검
  파일: 실사 관련 컴포넌트
  수정: 실사 생성 API 호출 시 DTO 확인, 에러 핸들링

FIX-F05: 보고서/PDF 다운로드 에러 핸들링
  파일: 보고서/PDF 관련 컴포넌트
  수정: PDF 다운로드 실패 시 사용자에게 에러 메시지 표시

규칙:
- 기존 React 패턴 따르기
- BACKEND API 수정 전이라도 에러 핸들링(try-catch, fallback UI)은 먼저 가능
- BACKEND FIX 완료 알림 받으면 연동 테스트
- 매 FIX 시작 전 ARCHITECT에게 plan → 승인 후 구현

■ TESTER — 수정 검증 + 회귀 테스트

=== BACKEND FIX 완료 즉시 재테스트 ===

RT-01: FIX-01 검증 (packQty validation)
  - POST /ordering/plans with packQty=-5 → 400 에러 확인
  - POST /ordering/plans with packQty=0 → 400 에러 확인
  - POST /ordering/plans with packQty=1 → 정상 확인
  - POST /ordering/cart with quantity=-1 → 기존처럼 400 확인 (회귀)

RT-02: FIX-02 검증 (공급사-품목)
  - 원두상사(supplierId=2)에 서울우유(packagingId=11) → 400 에러 확인
  - 원두상사에 에티오피아 원두 → 정상 확인

RT-03: FIX-03 검증 (금액 계산)
  - POST /ordering/plans로 에티오피아 원두 3팩 → totalAmount=75,000원 확인
  - vatAmount=7,500원 확인
  - 카트 흐름 금액 계산도 여전히 정상 확인 (회귀)

RT-04: FIX-04 검증 (cutoffAt)
  - 직접 생성 → confirm → cutoffAt이 null이 아닌지 확인
  - 또는 cutoffAt=null일 때 취소 시도 → 적절한 에러

RT-05: FIX-05 검증 (장바구니 unique)
  - POST /ordering/cart 반복 생성 → unique 충돌 없이 정상

RT-06: FIX-06 검증 (maxOrderQty)
  - packQty=999, maxOrderQty=100 → 400 에러 확인
  - packQty=100 → 정상 확인

RT-07: FIX-07 검증 (404)
  - supplierId=99999 → 404 에러 확인 (500이 아님)

RT-08: FIX-08 검증 (클레임 해결)
  - PUT /claims/{id}/resolve → 200 확인

RT-09: FIX-09 검증 (대시보드)
  - GET /dashboard/store/{storeId} → 200 확인

RT-10: FIX-10 검증 (재고실사)
  - POST /physical-count → 정상 생성 확인

RT-11: FIX-11 검증 (보고서/PDF)
  - GET /ordering/plans/{id}/pdf → 200 확인
  - GET /reports → 200 확인

=== 회귀 테스트 (기존 정상 기능 깨짐 없는지) ===

RG-01: 카트 흐름 전체 (POST /cart → GET /cart → POST /cart/{id}/confirm)
RG-02: 입고 흐름 (POST /receiving/from-order → 재고 증가 확인)
RG-03: POS 판매 → 재고 FIFO 차감
RG-04: 배송정책/카탈로그 조회
RG-05: 저재고 알림, 유통기한 알림
RG-06: 재발주 (POST /ordering/reorder/{id})

=== 최종 빌드 ===

BUILD-01: mvn clean package -DskipTests=false (백엔드 전체 테스트)
BUILD-02: npm run build (프론트엔드 빌드)
BUILD-03: 기존 단위 테스트 깨짐 없는지 확인

규칙:
- BACKEND FIX 완료 알림 즉시 해당 RT 실행
- 테스트 실패 → 해당 팀메이트에게 직접 피드백
- 회귀 테스트는 P0(FIX-01~04) 완료 후 바로 실행
- 모든 RT + RG + BUILD 통과 후 ARCHITECT에게 보고

=== 작업 흐름 ===

■ Phase 1 (분석/준비):
  ARCHITECT → QA_REPORT.md + 코드 분석 → 수정 계획 확정 → 팀에 지시
  BACKEND → 관련 서비스 코드 분석, 수정 plan 작성
  FRONTEND → 관련 컴포넌트 분석, 수정 plan 작성
  TESTER → 테스트 환경 확인, 테스트 데이터 존재 여부 확인

■ Phase 2 (P0 — Critical 수정):
  BACKEND → FIX-01 → FIX-02 → FIX-03 → FIX-04 순차
  FRONTEND → FIX-F01 (validation 강화), FIX-F02 (대시보드 fallback)
  TESTER → RT-01~04 (BACKEND 완료분 즉시) + RG-01~06 (회귀)
  ARCHITECT → 코드 리뷰, git commit -m "P0: Critical 4건 수정"

■ Phase 3 (P1 — Major 수정):
  BACKEND → FIX-05 → FIX-06 → FIX-07 → FIX-08 → FIX-09 → FIX-10 → FIX-11
  FRONTEND → FIX-F03, FIX-F04, FIX-F05
  TESTER → RT-05~11 (완료분 즉시)
  ARCHITECT → 코드 리뷰, git commit -m "P1: Major 7건 수정"

■ Phase 4 (P2 + 최종):
  BACKEND → FIX-12, FIX-13, FIX-14
  TESTER → BUILD-01~03 (최종 빌드 + 전체 테스트)
  ARCHITECT → 최종 리뷰 → docs/FIX_REPORT.md 작성 → git push

=== 필수 규칙 ===

1. 카트 흐름(confirmCart, modifyOrder)의 기존 정상 동작을 절대 깨뜨리지 않기
2. QA_REPORT.md의 "부록 C: 긍정적 발견 사항" 10개 항목 = 깨지면 안 되는 것
3. 파일 충돌 방지: 같은 파일 동시 수정 X
4. BACKEND P0 (FIX-01~04) 완료 → 반드시 TESTER 회귀 테스트 통과 후 P1 진행
5. 모든 팀메이트는 작업 전 plan → ARCHITECT 승인 후 구현
6. 에러 없이 빌드 확인 후 다음 FIX
7. 새 Flyway 마이그레이션 버전 충돌 주의 (현재 최신 버전 확인 후 +1)

=== 완료 후 ===

docs/FIX_REPORT.md 작성:
1. 수정된 FIX 목록 + 각 수정 요약
2. 생성/수정된 파일 목록
3. 재테스트 결과 (RT 전체 + 회귀 RG 전체)
4. 빌드 결과
5. 잔여 이슈 (있으면)
6. QA 50건 재판정: 기존 FAIL 17건 중 수정된 건수

git commit -m "QA FIX: Critical 4 + Major 7 + Minor 3 수정 완료" && git push origin main
모든 팀메이트 종료하고 팀 정리해줘.
```
