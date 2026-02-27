# AGENT_TEAMS_V5.1.md — 발주 시스템 Agent Teams 실행 가이드

---

## 1. 사전 설정 (settings.json)

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
      "Bash(curl *)"
    ]
  }
}
```

---

## 2. Agent Teams 실행 프롬프트

아래를 Claude Code 터미널에 붙여넣기:

```
docs/TASKS_V5.1.md를 읽고 발주 시스템을 에이전트 팀으로 병렬 구현해줘.

프로젝트: /home/ubuntu/coffee-inventory
스택: Spring Boot 3 + JPA + Flyway + MySQL + React + Tailwind + shadcn/ui
API 패턴: ApiResponse<T>, /api/v1/

=== 4명 팀 구성 ===

■ ARCHITECT (시스템기획) — delegate mode, 코드 직접 작성 X
담당: 전체 설계, 조율, 코드리뷰, 품질관리

시작 작업:
1. 프로젝트 구조 전체 파악
   - src/main/java 패키지 구조, 엔티티, 서비스, 컨트롤러 목록
   - src/main/resources/db/migration 기존 Flyway 버전 확인
   - frontend/src 디렉토리, 라우팅, 컴포넌트 구조
2. docs/TASKS_V5.1.md 정독 후 구현 계획 수립
3. 기존 핵심 엔티티 분석: OrderPlan, OrderLine, Delivery, DeliveryLine, StockLedger, InventorySnapshot, Item, Packaging, Supplier
4. 기존 API 패턴 분석: ApiResponse 형식, 에러 핸들링, 인증/권한 처리 방식

각 팀메이트에게 전달할 것:
- BACKEND에게: 정확한 DDL, 엔티티 필드명, 서비스 메서드 시그니처, 기존 네이밍 규칙
- FRONTEND에게: API 엔드포인트 + Request/Response DTO 스펙, 기존 React 패턴
- TESTER에게: 테스트 시나리오, 엣지케이스 목록, 기존 테스트 패턴

진행 중 작업:
- 각 팀메이트의 plan 검토 후 승인/반려
- 완료된 코드 리뷰 (기존 코드와 충돌, 네이밍 일관성)
- TASKS_V5.1.md 체크박스 [x] 업데이트
- 각 Phase 완료 시: git add . && git commit -m "PHASE XX: 설명" && git push origin main

■ BACKEND (백엔드) — 서비스/컨트롤러/DB 구현
담당 TASK 순서:

[Phase 17 - 발주 핵심]
TASK-054: Flyway V7__ordering_system.sql
  - delivery_policy, store_delivery_policy, delivery_holiday
  - item_category (대/중/소 3단계)
  - items 확장 (category_id, lead_time_days, max_order_qty, image_url, temperature_zone, is_orderable)
  - order_cart, order_cart_item (매장 공유 장바구니)
  - order_plans 확장 (delivery_date, cutoff_at, fulfillment_status, delivery_policy_id, total_amount, vat_amount)
  - deliveries 확장 (ref_type, ref_id)
  - claim, claim_line, claim_image (클레임/반품)
  - inventory_audit, inventory_audit_line (재고실사)

TASK-055: DeliveryPolicyService (배송정책 엔진)
  - getStorePolicy(), getAvailableDates(), isItemOrderableForDate()
  - calculateCutoff(), checkOrderAvailability()
  - 09시 기준 D+2/D+3, 배송요일 필터, 공휴일 제외
  - GET /api/v1/ordering/delivery-dates
  - GET /api/v1/ordering/availability

TASK-056: 부재료 카탈로그 API
  - GET /api/v1/ordering/catalog (정책 통과 상품만, 저재고 상단, 추천수량)
  - GET /api/v1/ordering/categories (3단계 카테고리 트리)
  - OrderRecommendationService (추천 발주 수량 계산)

TASK-057: 장바구니 API
  - POST /api/v1/ordering/cart (생성/추가, 공급사 자동매핑)
  - GET /api/v1/ordering/cart (공급사별 그룹핑)
  - PUT /api/v1/ordering/cart/items/{id} (수량변경)
  - DELETE /api/v1/ordering/cart/items/{id}, DELETE /api/v1/ordering/cart/{cartId}

TASK-058: 발주 확정/전송 API
  - POST /api/v1/ordering/cart/{cartId}/confirm (공급사별 OrderPlan 분리)
  - POST /api/v1/ordering/plans/{id}/cancel (cutoff 이전만)
  - PUT /api/v1/ordering/plans/{id} (수정, CONFIRMED+cutoff 이전만)
  - @Scheduled 컷오프 자동확정 (09:00 CONFIRMED→DISPATCHED)

TASK-061: 빠른 재발주 API
  - GET /api/v1/ordering/history, POST /api/v1/ordering/reorder/{orderPlanId}

[Phase 18 - 입고]
TASK-062: 발주↔입고 연동
  - GET /api/v1/receiving/pending
  - POST /api/v1/receiving/from-order/{orderPlanId} (Delivery 자동생성)
  - PUT /api/v1/receiving/deliveries/{id}/confirm (ledger RECEIVE + snapshot)
  - 전체입고→RECEIVED, 부분입고→PARTIALLY_RECEIVED

[Phase 19 - 클레임]
TASK-063: 클레임 API
  - POST /api/v1/claims, POST /api/v1/claims/{id}/images
  - GET /api/v1/claims, GET /api/v1/claims/{id}
  - PUT /api/v1/claims/{id}/resolve, GET /api/v1/claims/categories

[Phase 20 - 재고실사]
TASK-065: 재고실사 API
  - GET /api/v1/inventory/audit/availability
  - POST /api/v1/inventory/audit (snapshot 기반 라인 자동생성)
  - PUT /api/v1/inventory/audit/{id}/lines, PUT /api/v1/inventory/audit/{id}/complete
  - 완료 시 StockLedger ADJUST → snapshot 갱신

[Phase 21 - FIFO/유통기한]
TASK-067: 유통기한 알림 & FIFO
  - GET /api/v1/inventory/expiry-alerts, GET /api/v1/inventory/snapshot/lots
  - 스케줄러(07:00) D-7/D-3/D-0 알림, FIFO 차감 로직

[Phase 22-23 - 대시보드/재고]
TASK-068: 매장 대시보드 API (GET /api/v1/dashboard/store/{storeId}/today)
TASK-071: 빠른 재고조정 + 소진예측 API

[Phase 24 - 풀필먼트/품절]
TASK-072: 풀필먼트 상태 API (PUT /api/v1/admin/ordering/plans/{id}/fulfillment)
TASK-073: 품절관리 API (GET/POST/DELETE /api/v1/soldout/*)

규칙:
- 반드시 기존 ApiResponse<T> 패턴 사용
- 기존 엔티티 확장 우선, 새 엔티티 최소화
- DeliveryPolicyService는 delivery_policy 테이블 기반. 하드코딩 절대 X
- 매 TASK 시작 전 ARCHITECT에게 plan 보내고 승인 후 구현
- 매 TASK 완료 시 ARCHITECT + TESTER에게 알림

■ FRONTEND (프론트엔드) — React 화면 구현
담당 TASK 순서:

[Phase 17 - 발주 화면]
TASK-059: 발주 화면 전면 개편
  /store/ordering — 메인 (장바구니 현황, 저재고 알림, 최근발주, 신규발주 버튼)
  /store/ordering/new — 3단계:
    Step 1: 납품일 캘린더 (배송가능일만 활성, 배송타입 표시, 마감시간)
    Step 2: 상품 선택 (카테고리 탭, 검색, 저재고 상단, +/- 수량, 사진뷰/리스트뷰 토글, 소진예상일, 플로팅 장바구니바)
    Step 3: 장바구니 & 발주 확정 (공급사별 그룹핑, 수량수정, VAT포함 합계, 마감안내, 확정 모달)
  발주 완료 화면 (요약 + 주문현황/메인 이동)

TASK-060: 주문현황 & 수정
  /store/ordering/history — 상태별 탭 (전송대기/전송완료/배송중/입고완료/취소)
  풀필먼트 상태 뱃지 (대기/출고예정/배송중/완료)
  발주 상세 — 타임라인 (확정→전송→배송→입고) + 상품목록 + 금액
  수정/취소 (CONFIRMED + cutoff 이전만)

TASK-061 화면: 빠른 재발주 버튼 → 장바구니 자동채움 → 장바구니로 이동

[Phase 18 - 입고 화면]
TASK-062 화면:
  /store/receiving — [발주 기반 입고] / [바코드 스캔 입고] 탭
  발주 기반: 발주수량 vs 입고수량 비교, 유통기한 입력, 부분입고

[Phase 19 - 클레임 화면]
TASK-064: 클레임 화면
  /store/claims — 상태별 탭
  /store/claims/new — 입고 기반 상품선택, 유형, 사진 촬영/업로드, 설명
  /store/claims/{id} — 타임라인, 사진 갤러리, 본사 답변

[Phase 20 - 재고실사 화면]
TASK-066: 재고실사 화면
  /store/inventory/audit — 목록
  /store/inventory/audit/new — 카테고리 탭, 시스템수량 표시, 실제수량 입력, 차이 자동계산
  /store/inventory/audit/{id} — 결과 요약 (차이, 금액 환산)

[Phase 22-23 - 대시보드/재고]
TASK-069: 매장 대시보드
  /store/dashboard — 오늘 할 일 5카드 (긴급발주/장바구니/입고대기/유통기한/클레임)
  재고 프로그레스바, 최근 발주, 빠른 액션 5버튼 (발주/입고/실사/폐기/클레임)

TASK-070: 재고 현황 개선
  재고 게이지바, 소진예상일, "발주하기"→장바구니 추가, 카테고리 필터, 정렬

규칙:
- 기존 React 구조/라우팅/컴포넌트 패턴 먼저 파악하고 따르기
- Tailwind + shadcn/ui (Card, Badge, Calendar, Dialog, Sheet, Tabs)
- 모바일 퍼스트 (터치 타겟 48px+, 스크롤 최소화)
- BACKEND API가 아직 없으면 mock 데이터로 UI 먼저 구현, 나중에 연결
- 매 TASK 시작 전 ARCHITECT에게 plan → 승인 후 구현
- 매 TASK 완료 시 ARCHITECT에게 알림

■ TESTER (테스트) — 테스트 작성 + 통합 검증
담당: BACKEND/FRONTEND 완료분 즉시 테스트

[BACKEND 테스트 — 완료 알림 받는 즉시 작성]
T-01: TASK-054 검증 — Flyway 마이그레이션 정상 적용 (빌드 성공)
T-02: TASK-055 DeliveryPolicyService 단위 테스트
  - 09시 이전/이후 cutoff 분기
  - MON_WED_FRI / TUE_THU_SAT / EVERYDAY 각각
  - D+2/D+3 리드타임 계산
  - 일요일/공휴일 스킵
  - 아이템별 lead_time_days > 정책 기본값
T-03: TASK-056 카탈로그 테스트
  - 납품일 기반 필터링 (정책 미통과 상품 제외)
  - 추천 수량 계산 정확도
  - 카테고리 트리 반환
T-04: TASK-057 장바구니 통합 테스트
  - CRUD 정상 흐름
  - 매장 공유 (유저A 추가 → 유저B 조회)
  - max_order_qty 초과 거부
  - 공급사 자동매핑 검증
T-05: TASK-058 발주 확정/취소 테스트
  - confirm → 공급사별 OrderPlan 분리
  - cutoff 이전 취소 성공
  - cutoff 이후 취소 실패 (400 에러)
  - VAT 계산 정확도
  - 스케줄러 CONFIRMED→DISPATCHED
T-06: TASK-062 발주→입고 연동 테스트
  - 전체입고 → RECEIVED
  - 부분입고 → PARTIALLY_RECEIVED
  - stock_ledger RECEIVE 기록
  - inventory_snapshot 갱신
T-07: TASK-063 클레임 테스트
  - 등록/조회/상태변경 흐름
  - 이미지 첨부
T-08: TASK-065 재고실사 테스트
  - snapshot 기반 라인 자동생성
  - 실제수량 입력 → 차이 계산
  - complete → StockLedger ADJUST → snapshot 갱신
T-09: TASK-067 FIFO/유통기한 테스트
  - 만료 임박 알림 (D-7/D-3/D-0)
  - FIFO 차감 (오래된 LOT 먼저)
T-10: TASK-068 대시보드 API 테스트
T-11: TASK-072~073 풀필먼트/품절 테스트

[프론트엔드 테스트]
T-12: 발주 3단계 E2E (캘린더→상품담기→확정 전송)
T-13: 주문현황 필터/수정/취소
T-14: 대시보드 데이터 바인딩

[최종 빌드 검증]
T-15: mvn clean package -DskipTests=false (백엔드 전체)
T-16: npm run build (프론트엔드 전체)
T-17: 기존 테스트 깨짐 여부 확인

규칙:
- 기존 테스트 패턴 따르기 (@SpringBootTest, @DataJpaTest, @WebMvcTest 등)
- BACKEND 태스크 완료 알림 받으면 즉시 해당 테스트 작성
- 테스트 실패 → 해당 팀메이트(BACKEND/FRONTEND)에게 직접 메시지
- 모든 테스트 통과 후 ARCHITECT에게 보고

=== 작업 흐름 ===

■ Phase 1 (기반 분석):
  ARCHITECT → 프로젝트 분석 → 계획 수립 → 팀에 지시
  BACKEND → TASK-054 (DB 스키마) 준비
  FRONTEND → 기존 React 구조 분석 + 공통 컴포넌트 파악
  TESTER → 기존 테스트 구조 분석 + 테스트 계획

■ Phase 2 (발주 핵심 — TASK-054~058):
  BACKEND → 054→055→056→057→058 순차
  FRONTEND → TASK-059, 060 UI 구현 (mock 데이터 먼저)
  TESTER → T-01~T-05 (BACKEND 완료분 즉시)
  ARCHITECT → plan 리뷰 + 코드 리뷰

■ Phase 3 (입고/클레임/실사 — TASK-062~066):
  BACKEND → 062→063→065
  FRONTEND → 062화면→064→066
  TESTER → T-06~T-08
  ARCHITECT → 리뷰 + 체크박스 업데이트

■ Phase 4 (FIFO/대시보드/재고/풀필먼트 — TASK-067~073):
  BACKEND → 067→068→071→072→073
  FRONTEND → 069→070
  TESTER → T-09~T-14 + T-15~T-17 최종 빌드
  ARCHITECT → 최종 리뷰 + git push

=== 필수 규칙 ===

1. 파일 충돌 방지: 같은 파일 동시 수정 X. ARCHITECT가 담당 파일 분배
2. 의존성 순서: BACKEND 엔티티/서비스 완성 → FRONTEND API 연결 → TESTER 검증
3. FRONTEND는 API 미완성 시 mock으로 먼저 진행
4. ARCHITECT는 delegate mode — 코드 작성 X, 조율/리뷰/승인만
5. 모든 팀메이트는 작업 전 plan을 ARCHITECT에게 보내고 승인 후 구현
6. 매 TASK 완료 시 TASKS_V5.1.md 체크박스 [x] 업데이트
7. 에러 없이 빌드 확인 후 다음 TASK
8. Phase 완료 시: git add . && git commit -m "메시지" && git push origin main
```

---

## 3. 팀 모니터링 키보드

| 키 | 기능 |
|---|---|
| `Shift+Down` | 다음 팀메이트 |
| `Shift+Up` | 이전 팀메이트 |
| `Ctrl+T` | 태스크 목록 |
| `Enter` | 선택한 세션 보기 |
| `Escape` | 작업 중단 |

---

## 4. 토큰 참고

- 4명 팀 ≈ 단일 세션 대비 4~7배 토큰
- Max 20× 권장 (Max 5×는 Phase 2~3 중 소진 가능)
- ARCHITECT의 plan 리뷰가 불필요한 재작업을 막아 비용 절감

---

## 5. 트러블슈팅

| 증상 | 해결 |
|---|---|
| 팀메이트 권한 요청에서 멈춤 | settings.json permissions.allow 확인 |
| 팀메이트끼리 파일 충돌 | ARCHITECT에게 "파일 담당 재분배" 지시 |
| FRONTEND가 API 없어서 멈춤 | "mock 데이터로 UI 먼저 구현" 지시 |
| 빌드 에러 | TESTER에게 "빌드 에러 원인 파악" 지시 → 해당 팀에 피드백 |
| 토큰 한도 도달 | Phase 단위로 끊어서 실행 (Phase 2만 먼저 등) |
