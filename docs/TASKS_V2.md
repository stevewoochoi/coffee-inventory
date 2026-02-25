# TASKS_V2.md - 커피 재고관리 시스템 추가 개발 태스크

> V1 (TASK-001~025) 완료 이후 추가 기능
> 우선순위: P1 (운영 필수) → P2 (효율 향상) → P3 (UX 강화)

---

## PHASE 8: 유통기한 관리 + FIFO [P1]

- [x] **TASK-026** | 유통기한 DB 스키마 확장
  - `inventory_snapshot`에 `exp_date` 컬럼 추가 (lot별 스냅샷)
  - `stock_ledger`에 `exp_date`, `lot_no` 컬럼 추가
  - `item_expiry_alert` 테이블 신규 생성:
    ```sql
    CREATE TABLE item_expiry_alert (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      store_id BIGINT NOT NULL,
      item_id BIGINT NOT NULL,
      lot_no VARCHAR(100),
      exp_date DATE NOT NULL,
      qty_base_unit DECIMAL(12,3) NOT NULL,
      alert_status ENUM('NORMAL','WARNING','CRITICAL','EXPIRED') DEFAULT 'NORMAL',
      notified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ```
  - Flyway 마이그레이션 파일 작성 (V2__expiry_management.sql)
  - 테스트: 마이그레이션 정상 적용 확인

- [x] **TASK-027** | FIFO 재고 차감 로직
  - 입고 시 lot_no + exp_date 기준으로 재고 적재
  - POS 판매/사용 차감 시 exp_date 오름차순(가장 오래된 것부터) 자동 차감
  - FifoStockService 구현
  - lot별 현재 재고 조회 API: GET /api/v1/inventory/snapshot/lots?storeId={id}&itemId={id}
  - 테스트: FIFO 순서 검증 (lot A exp 1/31, lot B exp 2/28 → A 먼저 차감)

- [x] **TASK-028** | 유통기한 알림 스케줄러
  - Spring @Scheduled로 매일 오전 8시 실행
  - D-7 이하: WARNING, D-3 이하: CRITICAL, D-0 이하: EXPIRED 자동 업데이트
  - 아이템별 알림 상태를 item_expiry_alert 테이블에 기록
  - GET /api/v1/inventory/expiry-alerts?storeId={id} (임박 목록 조회)
  - 테스트: 날짜별 알림 상태 변경 로직 단위 테스트

- [x] **TASK-029** | 유통기한 알림 React 화면
  - /store/expiry - 유통기한 임박 목록 (태블릿용)
    - CRITICAL (D-3): 빨간색 카드
    - WARNING (D-7): 노란색 카드
    - EXPIRED: 회색 + 취소선
  - /admin/expiry - 전체 매장 유통기한 현황
  - 메인 대시보드에 임박 알림 배지 표시
  - 디자인: 색상 코드 명확히, 터치 친화적

---

## PHASE 9: 실사(Physical Count) [P1]

- [x] **TASK-030** | 실사 DB 스키마
  - `physical_count` 테이블:
    ```sql
    CREATE TABLE physical_count (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      store_id BIGINT NOT NULL,
      count_date DATE NOT NULL,
      status ENUM('IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'IN_PROGRESS',
      counted_by BIGINT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ```
  - `physical_count_line` 테이블:
    ```sql
    CREATE TABLE physical_count_line (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      count_id BIGINT NOT NULL,
      item_id BIGINT NOT NULL,
      system_qty DECIMAL(12,3) NOT NULL,   -- 실사 시작 시점 시스템 재고
      actual_qty DECIMAL(12,3),            -- 실제 세어본 수량
      gap_qty DECIMAL(12,3),               -- actual - system
      note TEXT,
      FOREIGN KEY (count_id) REFERENCES physical_count(id)
    );
    ```
  - Flyway V3__physical_count.sql 작성

- [x] **TASK-031** | 실사 API
  - POST /api/v1/physical-count/start (실사 시작 → 현재 스냅샷 기준으로 라인 자동 생성)
  - PUT /api/v1/physical-count/{id}/lines/{lineId} (실제 수량 입력)
  - POST /api/v1/physical-count/{id}/complete (실사 완료 → 차이분 StockLedger에 ADJUST 기록)
  - GET /api/v1/physical-count/history?storeId={id} (실사 이력)
  - 테스트: 실사 시작 → 수량 입력 → 완료 → 재고 조정 흐름 통합 테스트

- [x] **TASK-032** | 실사 React 화면 (태블릿)
  - /store/physical-count - 실사 목록 + 새 실사 시작
  - /store/physical-count/{id} - 실사 진행 화면
    - 아이템별 시스템 수량 표시
    - 실제 수량 직접 입력 (숫자 키패드)
    - 차이(Gap) 실시간 표시 (빨강/초록)
    - 완료 버튼 → 확인 모달 → 재고 자동 조정
  - 디자인: 입력 필드 크게, 스크롤 최소화

---

## PHASE 10: 저재고 알림 [P1]

- [x] **TASK-033** | 안전재고 설정 DB + API
  - `item` 테이블에 `min_stock_qty` 컬럼 추가 (Flyway V4)
  - PUT /api/v1/master/items/{id}/min-stock (아이템별 최소재고 설정)
  - GET /api/v1/inventory/low-stock?storeId={id} (저재고 아이템 목록)
  - 저재고 판단: inventory_snapshot.qty_base_unit <= item.min_stock_qty
  - 테스트: 저재고 조회 로직 테스트

- [x] **TASK-034** | 저재고 알림 스케줄러 + 화면
  - 매일 오전 9시 스케줄러: 저재고 아이템 감지 → low_stock_alert 기록
  - /store/inventory 화면에 저재고 아이템 상단 고정 표시
  - 저재고 뱃지: 헤더/네비게이션에 숫자 표시
  - 발주 추천 화면과 연동 (저재고 → 발주 추천으로 바로 이동)
  - 테스트: 임계치 이하 감지 및 알림 생성 테스트

---

## PHASE 11: 대시보드 / 리포트 [P2]

- [x] **TASK-035** | 대시보드 API
  - GET /api/v1/dashboard/store/{storeId} (매장 대시보드 데이터)
    - 오늘 입고 건수, 폐기량, 저재고 수, 유통기한 임박 수
    - 최근 7일 일별 소비량 추이 (아이템별)
    - 이번달 발주 비용 합계
  - GET /api/v1/dashboard/brand/{brandId} (브랜드 전체 대시보드)
    - 매장별 저재고 현황 비교
    - 매장별 로스율 비교
    - 전체 발주 비용 추이

- [x] **TASK-036** | 리포트 API
  - GET /api/v1/reports/consumption?storeId={id}&from={date}&to={date} (소비량 리포트)
  - GET /api/v1/reports/waste?storeId={id}&from={date}&to={date} (폐기 리포트)
  - GET /api/v1/reports/order-cost?storeId={id}&month={yyyyMM} (발주 비용 리포트)
  - GET /api/v1/reports/loss-rate?storeId={id} (아이템별 로스율 추이)

- [x] **TASK-037** | 대시보드 React 화면
  - /admin/dashboard - 브랜드 전체 대시보드
    - 매장별 현황 카드 그리드
    - Recharts 라이브러리로 소비량 추이 라인차트
    - 발주 비용 바차트
    - 로스율 히트맵 (매장 x 아이템)
  - /store/dashboard - 매장 대시보드 (태블릿 홈화면으로 사용)
    - 오늘의 주요 지표 카드 4개
    - 저재고 알림, 유통기한 임박 알림
    - 빠른 액션 버튼 (입고, 폐기, 실사, 발주)

---

## PHASE 12: 아이템 이미지 등록 [P2]

- [x] **TASK-038** | 이미지 업로드 API
  - S3 presigned URL 발급 API: GET /api/v1/upload/presigned-url
  - 업로드 완료 후 item 테이블에 image_url 저장
  - POST /api/v1/master/items/{id}/image
  - packaging 테이블에도 image_url 컬럼 추가 (Flyway V5)
  - 테스트: presigned URL 생성 및 URL 저장 테스트

- [x] **TASK-039** | 이미지 관련 React 화면
  - 아이템 등록/수정 폼에 이미지 업로드 컴포넌트 추가
    - 드래그앤드롭 또는 카메라 촬영 (모바일)
    - 업로드 진행률 표시
    - 미리보기
  - 아이템 목록, 발주 화면, 입고 스캔 화면에 썸네일 표시
  - Packaging 목록에도 이미지 표시

---

## PHASE 13: 발주서 PDF 자동생성 [P2]

- [x] **TASK-040** | PDF 생성 라이브러리 설정
  - iText 또는 Apache PDFBox 의존성 추가
  - PdfGeneratorService 구현
  - 발주서 PDF 템플릿 설계:
    - 헤더: 브랜드 로고, 발주일, 발주번호
    - 발주처(공급사) 정보
    - 발주 아이템 테이블 (품목명, 포장단위, 수량, 단가, 소계)
    - 합계 금액
    - 푸터: 담당자 서명란

- [x] **TASK-041** | 발주서 PDF API + 이메일 연동
  - GET /api/v1/ordering/plans/{id}/pdf (PDF 생성 → S3 저장 → URL 반환)
  - 발주 dispatch 시 PDF 자동 생성 후 SES 이메일 첨부 발송
  - order_dispatch_log에 pdf_url 컬럼 추가
  - 테스트: PDF 생성 및 이메일 첨부 테스트

- [x] **TASK-042** | 발주서 PDF React 화면
  - 발주 상세 화면에 "PDF 미리보기" / "PDF 다운로드" 버튼
  - 발주 이력에서 과거 발주서 PDF 다운로드 가능
  - 이메일 발송 상태 표시 (발송완료/실패/재발송)

---

## PHASE 14: 모바일 PWA 강화 [P2]

- [x] **TASK-043** | PWA 기본 설정
  - vite-plugin-pwa 설치 및 설정
  - manifest.json 설정 (앱 이름, 아이콘, 테마컬러)
  - Service Worker 등록 (오프라인 캐시)
  - 홈 화면 추가 안내 배너 (iOS/Android)
  - 테스트: Lighthouse PWA 점수 90+ 확인

- [x] **TASK-044** | 푸시 알림 (Web Push)
  - Web Push API 백엔드 설정 (VAPID 키 생성)
  - push_subscription 테이블:
    ```sql
    CREATE TABLE push_subscription (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ```
  - POST /api/v1/push/subscribe (구독 등록)
  - 저재고 알림, 유통기한 임박 알림을 푸시로 발송
  - React: 알림 권한 요청 컴포넌트

- [x] **TASK-045** | 모바일 UX 최적화
  - 바코드 스캔: 카메라 API 개선 (ZXing-js 라이브러리)
  - 오프라인 모드: 입고 스캔 데이터 로컬 임시 저장 → 온라인 복구 시 자동 동기화
  - 스와이프 제스처: 목록 항목 스와이프로 빠른 삭제/수정
  - 햅틱 피드백: 스캔 성공/실패 시 진동

---

## 참고 사항 (Claude Code에게)

- V1과 동일한 코딩 규칙 적용
- 새 DB 테이블은 반드시 Flyway 마이그레이션으로 (V2, V3, V4, V5...)
- 스케줄러는 @Scheduled + @Transactional 조합
- PDF 생성은 iText7 사용 권장
- PWA는 vite-plugin-pwa 사용
- 차트는 Recharts 라이브러리 사용
- 이미지 업로드는 S3 presigned URL 방식 (서버를 거치지 않고 직접 업로드)
- 모든 새 기능은 기존 RBAC 권한 체계 따를 것
