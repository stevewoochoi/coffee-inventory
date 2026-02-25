# TASKS.md - 커피 재고관리 시스템 개발 태스크

> Claude Code가 이 파일을 읽고 순서대로 처리한다.
> 상태: TODO → IN_PROGRESS → DONE
> 각 태스크 완료 후 상태를 업데이트할 것.

---

## PHASE 1: 프로젝트 초기 세팅

- [x] **TASK-001** | 프로젝트 구조 생성
  - Spring Boot 3.x 프로젝트 생성 (Maven, Java 17)
  - 의존성: spring-web, spring-data-jpa, mysql-connector, spring-security, jjwt, lombok, flyway
  - React 18 프로젝트 생성 (Vite 기반)
  - 의존성: axios, react-router-dom, tailwindcss, shadcn/ui, zustand, react-query

- [x] **TASK-002** | Spring Boot 기본 설정
  - application.yml 환경변수 기반으로 작성 (DB, JWT, S3)
  - GlobalExceptionHandler 작성 (표준 에러 응답 포맷)
  - ApiResponse<T> 공통 응답 wrapper 작성
  - CORS 설정 (React 로컬 개발 허용)

- [x] **TASK-003** | DB 마이그레이션 초기 세팅
  - Flyway 설정
  - V1__init_schema.sql: ARCHITECTURE.md의 모든 테이블 생성 SQL 작성
  - 애플리케이션 시작 시 자동 마이그레이션 확인

---

## PHASE 2: 인증 (Auth)

- [x] **TASK-004** | JWT 인증 구현
  - users 테이블 JPA Entity/Repository 작성
  - JwtUtil (토큰 생성/검증/파싱)
  - JwtAuthenticationFilter
  - POST /api/v1/auth/login (이메일/비밀번호 → JWT 반환)
  - POST /api/v1/auth/refresh
  - 테스트: 로그인 성공/실패/토큰만료 단위 테스트

- [x] **TASK-005** | 권한(RBAC) 설정
  - SUPER_ADMIN / BRAND_ADMIN / STORE_MANAGER 역할 구분
  - @PreAuthorize 어노테이션 기반 접근 제어
  - JWT payload에 role, company_id, brand_id, store_id 포함
  - 테스트: 각 역할별 접근 가능/불가 엔드포인트 테스트

- [x] **TASK-006** | React 로그인 화면
  - /login 페이지 (이메일/비밀번호 폼)
  - JWT 저장 (localStorage)
  - axios interceptor (Authorization 헤더 자동 주입)
  - 로그인 후 역할별 리다이렉트 (/admin or /store)
  - 디자인: Tailwind CSS, shadcn/ui 사용, 깔끔한 미니멀 스타일

---

## PHASE 3: 마스터 데이터 (MVP 핵심)

- [x] **TASK-007** | Organization (Company/Brand/Store) API
  - Entity/Repository/Service/Controller 작성
  - CRUD API: GET/POST/PUT/DELETE
  - SUPER_ADMIN만 접근 가능
  - 테스트: 통합 테스트 작성

- [x] **TASK-008** | Item(부재료) API
  - Entity/Repository/Service/Controller 작성
  - GET /api/v1/master/items (브랜드별 목록, 페이징)
  - POST /api/v1/master/items (생성)
  - PUT /api/v1/master/items/{id} (수정)
  - DELETE /api/v1/master/items/{id} (비활성화, hard delete 금지)
  - 테스트: CRUD 단위/통합 테스트

- [x] **TASK-009** | Packaging(포장단위) API
  - Entity/Repository/Service/Controller 작성
  - Item 1:N 관계 처리
  - Packaging 변경 시 새 레코드 추가 + 기존 DEPRECATED 처리 (수정 금지 정책)
  - GET /api/v1/master/packagings?itemId={id}
  - POST /api/v1/master/packagings
  - DELETE /api/v1/master/packagings/{id} → status=DEPRECATED 처리
  - 테스트: deprecated 처리 로직 테스트

- [x] **TASK-010** | Supplier(공급사) API
  - Entity/Repository/Service/Controller 작성
  - CRUD API
  - SupplierItem (공급사별 SKU/가격/리드타임) 연결 포함
  - 테스트: 연관관계 포함 테스트

- [x] **TASK-011** | 마스터 데이터 관리 React 화면 (관리자)
  - /admin/items - 부재료 목록/등록/수정
  - /admin/packagings - 포장단위 관리
  - /admin/suppliers - 공급사 관리
  - 공통 Table 컴포넌트 (정렬, 페이징)
  - 공통 Modal 컴포넌트 (등록/수정 폼)
  - 디자인: shadcn/ui Table, Dialog, Form 사용

---

## PHASE 4: 재고 & 입고

- [x] **TASK-012** | StockLedger + InventorySnapshot API
  - Entity/Repository/Service 작성
  - 재고 변동 시 Ledger 기록 + Snapshot 자동 갱신 (트랜잭션)
  - GET /api/v1/inventory/snapshot?storeId={id} (현재 재고 목록)
  - GET /api/v1/inventory/ledger?storeId={id}&itemId={id} (변동 이력)
  - 테스트: 동시성 처리 테스트

- [x] **TASK-013** | Delivery(입고) API
  - Delivery CRUD
  - DeliveryScan: 바코드 스캔 → packaging_id 매핑 → 수량 누적
  - 입고 확정 시 StockLedger에 RECEIVE 기록 자동 생성
  - POST /api/v1/receiving/deliveries
  - POST /api/v1/receiving/deliveries/{id}/scans (바코드 스캔)
  - PUT /api/v1/receiving/deliveries/{id}/confirm (입고 확정)
  - 테스트: 스캔 → 입고 확정 → 재고 증가 흐름 테스트

- [x] **TASK-014** | 입고 스캔 React 화면 (태블릿 UX)
  - /store/receiving - 입고 목록
  - /store/receiving/{id}/scan - 바코드 스캔 화면
  - 카메라 스캔 또는 수동 입력 지원
  - 스캔 시 즉시 아이템명/수량 표시
  - 모바일/태블릿 최적화 (큰 버튼, 터치 친화적)

- [x] **TASK-015** | Waste(폐기/파손) API + 화면
  - Waste Entity/Repository/Service/Controller
  - POST /api/v1/waste (폐기 등록 → Ledger에 WASTE 자동 기록)
  - /store/waste - 폐기 등록 화면 (태블릿용)
  - 테스트: 폐기 → 재고 차감 흐름 테스트

- [x] **TASK-016** | 재고 현황 React 화면
  - /admin/inventory - 브랜드 전체 매장 재고 현황
  - /store/inventory - 매장별 현재 재고 목록
  - 재고 변동 이력 조회
  - 저재고 알림 표시 (임계치 이하 시 빨간색)

---

## PHASE 5: 레시피 & POS

- [x] **TASK-017** | Menu/Recipe API
  - Menu / MenuOption / RecipeComponent Entity/Repository/Service/Controller
  - CRUD API
  - GET /api/v1/recipe/menus (브랜드별 메뉴 목록)
  - POST /api/v1/recipe/menus/{id}/components (레시피 등록)
  - 테스트: 레시피 소모량 계산 테스트

- [x] **TASK-018** | POS 판매 데이터 수집 API
  - PosSales Entity/Repository/Service
  - POST /api/v1/pos/sales (판매 데이터 인입)
  - 판매 데이터 입력 시 레시피 기반으로 StockLedger에 SELL 자동 기록
  - GET /api/v1/pos/sales/summary?storeId={id}&date={date}
  - 테스트: 판매 → 재고 차감 흐름 테스트

- [x] **TASK-019** | 레시피 관리 React 화면
  - /admin/menus - 메뉴 목록
  - /admin/menus/{id}/recipe - 레시피 편집 (부재료 + 소모량)

---

## PHASE 6: 발주

- [x] **TASK-020** | 발주 추천 로직
  - 추천 발주 수량 계산 서비스
  - 공식: ceil((예상수요 * (리드타임+커버일수) + 안전재고 - 현재가용재고) / 포장당수량)
  - 로스율(loss_rate) 반영
  - GET /api/v1/ordering/suggestion?storeId={id}&supplierId={id}

- [x] **TASK-021** | 발주 관리 API
  - OrderPlan / OrderLine / OrderDispatchLog Entity/Repository/Service/Controller
  - POST /api/v1/ordering/plans (발주 계획 생성)
  - PUT /api/v1/ordering/plans/{id}/confirm (발주 확정)
  - POST /api/v1/ordering/plans/{id}/dispatch (발주 실행 - 이메일 발송)
  - SES를 통한 공급사 이메일 발주 (PDF 첨부)
  - 테스트: 발주 생성 → 확정 → 이메일 발송 흐름 테스트

- [x] **TASK-022** | 발주 React 화면
  - /store/ordering - 발주 목록 + 추천 발주 보기
  - /store/ordering/new - 발주 생성 (추천 수량 표시, 수동 수정 가능)
  - /admin/ordering - 전체 매장 발주 현황

---

## PHASE 7: 인프라 & 배포

- [x] **TASK-023** | Docker Compose 설정
  - backend Dockerfile (multi-stage build)
  - frontend Dockerfile (nginx static 서빙)
  - infra/docker-compose.yml 완성
  - nginx.conf (리버스 프록시 설정)

- [x] **TASK-024** | 배포 스크립트
  - deploy.sh (git pull → build → docker-compose up)
  - 환경변수 체크 로직 포함
  - 헬스체크 확인 후 배포 완료 메시지

- [x] **TASK-025** | 모니터링 설정
  - Spring Boot Actuator 엔드포인트 활성화
  - CloudWatch 로그 설정
  - 주요 에러 알림 (5xx, DB 연결 실패 등)

---

## 완료된 태스크

- TASK-001: 프로젝트 구조 생성
- TASK-002: Spring Boot 기본 설정
- TASK-003: DB 마이그레이션 초기 세팅 (Flyway + V1__init_schema.sql 20 테이블)
- TASK-004: JWT 인증 구현 (User Entity, JwtUtil, JwtAuthenticationFilter, AuthController, 테스트 17개)
- TASK-005: 권한(RBAC) 설정 (@PreAuthorize 기반 역할별 접근 제어, 테스트 11개)
- TASK-006: React 로그인 화면 (LoginPage, axios interceptor, Zustand authStore, ProtectedRoute)
- TASK-007: Organization API (Company/Brand/Store CRUD, SUPER_ADMIN 권한, 통합 테스트)
- TASK-008: Item API (CRUD, soft delete, 브랜드별 페이징)
- TASK-009: Packaging API (CRUD, DEPRECATED 처리)
- TASK-010: Supplier API (CRUD + SupplierItem 연관관계)
- TASK-011: 마스터 데이터 React 화면 (AdminLayout, Items/Packagings/Suppliers 페이지)
- TASK-012: StockLedger + InventorySnapshot API (재고 변동 원장 + 스냅샷 원자적 갱신, 테스트 5개)
- TASK-013: Delivery 입고 API (스캔→확정→재고 증가 흐름, 테스트 2개)
- TASK-014: 입고 스캔 React 화면 (StoreLayout, ReceivingPage 태블릿 UX)
- TASK-015: Waste 폐기/파손 API + 화면 (폐기→재고 차감, WastePage)
- TASK-016: 재고 현황 React 화면 (InventoryPage)
- TASK-017: Menu/Recipe API (메뉴, 레시피 컴포넌트 CRUD)
- TASK-018: POS 판매 데이터 수집 API (레시피 기반 재고 자동 차감, 테스트 1개)
- TASK-019: 레시피 관리 React 화면
- TASK-020: 발주 추천 로직 (OrderSuggestionService, 로스율/리드타임/커버일수 반영)
- TASK-021: 발주 관리 API (DRAFT→CONFIRMED→DISPATCHED 흐름, 테스트 3개)
- TASK-022: 발주 React 화면 (OrderingPage, NewOrderPage, OrderingAdminPage)
- TASK-023: Docker Compose 설정 (backend/frontend Dockerfile, docker-compose.yml, nginx reverse proxy)
- TASK-024: 배포 스크립트 (deploy.sh - 환경변수 체크, git pull, docker-compose, 헬스체크)
- TASK-025: 모니터링 설정 (Spring Boot Actuator - health, metrics, info, loggers)

---

## 참고 사항 (Claude Code에게)

- 모든 API는 `/api/v1/` prefix 사용
- 모든 응답은 `ApiResponse<T>` wrapper 사용: `{ success: true, data: T, message: "" }`
- 에러 응답: `{ success: false, data: null, message: "에러 메시지", code: "ERROR_CODE" }`
- JPA Entity는 Lombok @Data 대신 @Getter/@Setter/@Builder 사용
- 모든 삭제는 soft delete (is_active=false) 또는 status 변경, hard delete 금지
- DB 변경은 반드시 Flyway 마이그레이션 파일로 관리
- React 컴포넌트는 Tailwind CSS + shadcn/ui 사용, 파란색(blue) 계열 메인 컬러
- 태블릿(/store) 화면은 모바일 퍼스트, 큰 버튼, 터치 친화적 UX
- 테스트는 각 태스크마다 반드시 작성 (JUnit5 + @SpringBootTest)
