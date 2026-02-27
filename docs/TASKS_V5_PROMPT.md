TASKS_V5.md 파일을 읽고 순서대로 구현해줘.

파일 위치: /home/ubuntu/coffee-inventory/docs/TASKS_V5.md

구현 순서 (우선순위대로):
1. TASK-054: DB 스키마 보강 (Flyway V7) — delivery_policy, store_delivery_policy, delivery_holiday, item_category, order_cart/order_cart_item, items 확장, order_plans 확장(fulfillment_status/cutoff_at), deliveries 확장(ref_type/ref_id), claim/claim_line/claim_image, inventory_audit/inventory_audit_line
2. TASK-055: 배송정책 엔진 (DeliveryPolicyService) — 정책 테이블 기반 납품일/컷오프/리드타임 계산. 하드코딩 절대 금지
3. TASK-056: 카탈로그 API — 정책 통과 상품만 노출, 3단계 카테고리, 추천수량 계산(OrderRecommendationService)
4. TASK-057: 장바구니 API — 매장 공유, 공급사 자동 매핑, 정책 검증
5. TASK-058: 발주 확정/전송/취소 — 공급사별 OrderPlan 분리, cutoff_at 기반 수정/취소, 컷오프 자동확정 스케줄러(@Scheduled 09:00)
6. TASK-059: 발주 화면 3단계 (캘린더→상품→장바구니&확정) + 사진/리스트 토글 + 플로팅바
7. TASK-060: 주문현황/수정 — 상태+풀필먼트 탭, 타임라인, cutoff 이전만 수정
8. TASK-062: 발주↔입고 연동 — ref_type='ORDER_PLAN', 자동채움, 부분입고
9. TASK-063~064: 클레임/반품 — 입고 기반 신청, 사진첨부, 상태 추적
10. TASK-065~066: 재고실사 — 실사 가능여부→시작→수량입력→완료→ADJUST ledger
11. TASK-067: FIFO/유통기한 — 만료 알림 스케줄러, LOT별 FIFO 차감
12. TASK-068~069: 매장 대시보드 — 오늘할일 5카드, 재고현황, 빠른액션
13. TASK-070~071: 재고 화면 — 게이지바, 소진예측, 인라인 조정
14. TASK-061: 빠른 재발주 — 이전 발주→장바구니 자동 채움
15. TASK-072~073: 풀필먼트 상태 관리 + 품절관리

핵심 규칙:
- 기존 코드 구조와 API 패턴(ApiResponse<T>, /api/v1/) 먼저 파악 후 작업
- 기존 발주 API(TASK-020~022) 확장하되 하위호환 유지. 기존 코드 깨뜨리지 마
- **배송 정책은 delivery_policy 테이블 + DeliveryPolicyService로 캡슐화. 하드코딩 금지**
- fulfillment_status와 status는 별개 개념 (워크플로우 vs 물류 출고단계)
- delivery↔order 연결은 ref_type/ref_id 패턴 (stock_ledger와 동일)
- 실사 완료 시 반드시 StockLedger ADJUST 기록 → InventorySnapshot 갱신
- 클레임은 '입고된 상품' 기반으로만 신청 가능
- AI 추천은 PolicyService 게이트 통과 필수 (납품 가능일/포장단위/최대수량)
- 금액 표시는 i18n 로케일 연동, 모바일 반응형
- 각 태스크 완료 후 TASKS_V5.md 체크박스를 [x]로 업데이트
- 에러 없이 빌드되는지 확인 후 다음 태스크로 진행
- 각 태스크 완료 후 git add, commit, push origin main
- 작업 시작 전에 현재 프로젝트 구조를 먼저 보여줘
