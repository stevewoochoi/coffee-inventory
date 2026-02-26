# TASKS_V3 — 다국어 / 모바일 대응 / 테마 컬러 관리

## 개요

커피 재고 관리 시스템의 3단계 업그레이드.  
**언어팩(i18n)**, **모바일 반응형**, **관리자 테마 컬러 설정** 기능을 추가한다.

---

## V3-1. 다국어 지원 (i18n)

### V3-1-1. 언어팩 구조 설계

- [x] `/locales` 디렉토리 생성
- [x] 언어별 JSON 파일 구성
  ```
  /locales
    ├── en.json    (영어 — 기본)
    ├── ko.json    (한국어)
    └── ja.json    (일본어)
  ```
- [x] 번역 키 네이밍 컨벤션 확정 (dot notation)
  ```
  예: "nav.dashboard", "inventory.addItem", "common.save"
  ```

### V3-1-2. 번역 키 정의 (전체 UI 텍스트)

- [x] **공통 (common)**
  - save, cancel, delete, edit, confirm, search, loading, error, success, back, next, close, submit, reset, logout, settings
- [x] **네비게이션 (nav)**
  - dashboard, inventory, orders, suppliers, reports, settings, users, logout
- [x] **로그인 / 인증 (auth)**
  - login, signup, email, password, forgotPassword, resetPassword, rememberMe
- [x] **대시보드 (dashboard)**
  - title, totalItems, lowStock, recentOrders, monthlySummary, quickActions
- [x] **재고 관리 (inventory)**
  - title, addItem, editItem, deleteItem, itemName, category, quantity, unit, price, supplier, expiryDate, status, inStock, lowStock, outOfStock, search, filter, export
- [x] **주문 (orders)**
  - title, newOrder, orderDate, orderStatus, pending, confirmed, shipped, delivered, cancelled, total, details
- [x] **거래처 (suppliers)**
  - title, addSupplier, name, contact, email, phone, address, notes
- [x] **리포트 (reports)**
  - title, dateRange, generate, download, inventoryReport, orderReport, salesReport
- [x] **설정 (settings)**
  - title, language, theme, profile, notifications, general
- [x] **사용자 관리 (users)**
  - title, addUser, role, admin, manager, staff, active, inactive

### V3-1-3. 한국어 번역 (`ko.json`)

- [x] 전체 키에 대한 한국어 번역 작성
- [x] 한국어 날짜/시간 포맷 (`YYYY년 MM월 DD일`)
- [x] 한국어 숫자 포맷 (`₩1,000,000`)
- [x] 존댓말 톤 통일 (예: "저장하시겠습니까?")

### V3-1-4. 일본어 번역 (`ja.json`)

- [x] 전체 키에 대한 일본어 번역 작성
- [x] 일본어 날짜/시간 포맷 (`YYYY年MM月DD日`)
- [x] 일본어 숫자 포맷 (`¥1,000,000`)
- [x] 경어(敬語) 톤 통일 (예: "保存しますか？")

### V3-1-5. i18n 시스템 구현

- [x] i18n 라이브러리 선택 및 설치 (`react-i18next` 또는 커스텀 훅)
- [x] `useTranslation()` 훅 구현
  ```tsx
  const { t, locale, setLocale } = useTranslation();
  // 사용: t('inventory.addItem') → "재고 추가"
  ```
- [x] `<Trans>` 컴포넌트 (HTML 포함 번역용)
- [x] 동적 값 삽입 지원
  ```
  "inventory.itemCount": "총 {{count}}개 항목"
  ```
- [x] 복수형 처리 (영어: item/items)

### V3-1-6. 언어 전환 UI

- [x] 헤더 또는 설정 페이지에 언어 선택 드롭다운
- [x] 국기 아이콘 또는 언어 코드 표시 (🇺🇸 EN / 🇰🇷 KO / 🇯🇵 JA)
- [x] 선택한 언어 `localStorage`에 저장 (새로고침 유지)
- [x] 브라우저 기본 언어 자동 감지 (초기 접속 시)

### V3-1-7. 언어 변경 시 전체 반영

- [x] 모든 UI 텍스트 하드코딩 제거 → `t()` 함수로 교체
- [x] 날짜/시간 포맷 로케일 연동
- [x] 숫자/통화 포맷 로케일 연동
- [x] 폼 유효성 검사 메시지 번역
- [x] 토스트/알림 메시지 번역
- [x] 테이블 헤더, 빈 상태 메시지 번역

---

## V3-2. 모바일 반응형 대응

### V3-2-1. 레이아웃 브레이크포인트 정의

- [x] 브레이크포인트 설정
  ```
  mobile:   < 640px
  tablet:   640px ~ 1024px
  desktop:  > 1024px
  ```
- [x] Tailwind config에 커스텀 브레이크포인트 확인/추가

### V3-2-2. 네비게이션 모바일 대응

- [x] 데스크톱: 사이드바 네비게이션 (기존 유지)
- [x] 태블릿: 접히는 사이드바 (아이콘만 표시, 호버 시 확장)
- [x] 모바일: 하단 탭 바 + 햄버거 메뉴
  - 하단 탭: 주요 메뉴 4~5개 (대시보드, 재고, 주문, 설정)
  - 햄버거: 전체 메뉴 접근
- [x] 모바일 햄버거 메뉴 열기/닫기 애니메이션 (슬라이드)

### V3-2-3. 대시보드 모바일 대응

- [x] 카드 그리드: 데스크톱 4열 → 태블릿 2열 → 모바일 1열
- [x] 차트 영역: 가로 스크롤 또는 축소 표시
- [x] 요약 숫자 카드: 모바일에서 가로 스크롤 캐러셀

### V3-2-4. 테이블 모바일 대응

- [x] 데스크톱: 기존 테이블 그대로
- [x] 모바일: 카드형 리스트 뷰로 전환
  ```
  ┌──────────────────────┐
  │ ☕ 에티오피아 예가체프   │
  │ 재고: 24kg | ₩45,000  │
  │ 상태: ● 정상           │
  │ [수정] [삭제]          │
  └──────────────────────┘
  ```
- [x] 정렬/필터: 모바일에서는 바텀시트 또는 드롭다운으로

### V3-2-5. 폼 모바일 대응

- [x] 입력 필드 전체 너비 (모바일)
- [x] 날짜 선택: 네이티브 date input 활용
- [x] 셀렉트 박스: 네이티브 select 또는 바텀시트
- [x] 버튼: 모바일에서 하단 고정 (sticky bottom)
- [x] 키보드 올라올 때 레이아웃 깨짐 방지

### V3-2-6. 터치 인터랙션

- [x] 터치 타겟 최소 44×44px 보장
- [x] 스와이프 제스처 (리스트 아이템 삭제/편집)
- [x] Pull-to-refresh (목록 새로고침)
- [x] 더블탭 방지 (버튼 중복 클릭)

### V3-2-7. 모바일 성능 최적화

- [x] 이미지 lazy loading
- [x] 무한 스크롤 또는 페이지네이션 (대량 데이터)
- [x] 모바일 뷰포트 메타 태그 확인
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ```

---

## V3-3. 관리자 테마 컬러 설정

### V3-3-1. 테마 시스템 설계

- [x] CSS 변수 기반 테마 구조
  ```css
  :root {
    --color-primary: #8B4513;
    --color-primary-light: #A0522D;
    --color-primary-dark: #6B3410;
    --color-secondary: #D2691E;
    --color-accent: #F4A460;
    --color-bg: #FFF8F0;
    --color-bg-secondary: #FFF0E0;
    --color-text: #3E2723;
    --color-text-secondary: #6D4C41;
    --color-border: #D7CCC8;
    --color-success: #4CAF50;
    --color-warning: #FF9800;
    --color-danger: #F44336;
  }
  ```
- [x] Tailwind과 CSS 변수 연동
  ```js
  // tailwind.config.js
  colors: {
    primary: 'var(--color-primary)',
    'primary-light': 'var(--color-primary-light)',
    ...
  }
  ```

### V3-3-2. 프리셋 테마 제공

- [x] **Coffee Classic** — 브라운 톤 (기본)
- [x] **Modern Blue** — 블루/네이비 톤
- [x] **Forest Green** — 그린 톤
- [x] **Sunset Orange** — 오렌지/웜 톤
- [x] **Minimal Gray** — 모노톤 그레이
- [x] **Dark Mode** — 다크 테마
- [x] 각 프리셋에 대해 전체 컬러 팔레트 정의

### V3-3-3. 관리자 테마 설정 UI

- [x] 설정 > 테마 페이지
- [x] 프리셋 선택 (카드형 미리보기)
  ```
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ ██████  │  │ ██████  │  │ ██████  │
  │ Coffee  │  │  Blue   │  │  Green  │
  │ Classic │  │ Modern  │  │ Forest  │
  │  ✓ 선택  │  │  선택   │  │  선택   │
  └─────────┘  └─────────┘  └─────────┘
  ```
- [x] 커스텀 컬러 피커 (고급 설정)
  - Primary / Secondary / Accent 컬러 직접 선택
  - 실시간 미리보기
  - 초기화 버튼
- [x] 다크모드 토글 (별도)

### V3-3-4. 테마 저장 및 적용

- [x] 테마 설정 DB 저장 (관리자 설정 테이블)
- [x] API: `GET /api/settings/theme`, `PUT /api/settings/theme`
- [x] 앱 로드 시 테마 설정 불러와서 CSS 변수에 적용
- [x] 관리자가 변경 → 모든 사용자에게 실시간 반영
- [x] 테마 변경 시 부드러운 전환 애니메이션
  ```css
  * { transition: background-color 0.3s, color 0.3s, border-color 0.3s; }
  ```

### V3-3-5. 다크모드 지원

- [x] 다크모드 전용 컬러 팔레트
- [x] `prefers-color-scheme` 미디어 쿼리 연동 (자동 감지)
- [x] 수동 토글 (헤더에 🌙/☀️ 아이콘)
- [x] 다크모드 시 차트, 이미지, 그림자 조정

---

## 구현 우선순위

| 순서 | 작업 | 이유 |
|------|------|------|
| 1 | V3-1 i18n 시스템 + 언어팩 | 모든 UI 텍스트를 번역 키로 전환해야 이후 작업이 깔끔 |
| 2 | V3-3 테마 시스템 | CSS 변수 구조를 먼저 잡아야 모바일 대응 시 일관성 유지 |
| 3 | V3-2 모바일 반응형 | 레이아웃 전체 리팩토링이므로 마지막에 진행 |

---

## 기술 스택 참고

| 항목 | 선택 |
|------|------|
| i18n | `react-i18next` 또는 커스텀 Context + Hook |
| 날짜 포맷 | `Intl.DateTimeFormat` (네이티브) |
| 숫자/통화 | `Intl.NumberFormat` (네이티브) |
| 반응형 | Tailwind CSS 브레이크포인트 |
| 테마 | CSS Custom Properties + Tailwind |
| 컬러피커 | `react-colorful` (경량) |
| 아이콘 | `lucide-react` (기존 유지) |

---

## 완료 기준

- [ ] 영어/한국어/일본어 전환 시 모든 UI 텍스트가 올바르게 표시됨
- [ ] 모바일(iPhone SE ~ iPhone 15 Pro Max)에서 모든 페이지 정상 동작
- [ ] 태블릿(iPad)에서 최적화된 레이아웃 표시
- [ ] 관리자가 테마 프리셋을 변경하면 전체 앱 컬러가 변경됨
- [ ] 다크모드 정상 동작
- [ ] 성능: Lighthouse 모바일 점수 80+ 유지
