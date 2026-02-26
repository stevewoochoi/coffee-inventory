# TASKS_V4.md - 회원가입 / 관리자 승인 & 역할 관리

> V3 이후 추가 기능
> 회원가입 → 관리자 승인 → 역할 부여 흐름
> 한 매장에 복수 매장 관리자 허용

---

## PHASE 15: 회원가입 & 관리자 승인

### TASK-046 | 회원가입 DB 스키마 확장

- [ ] `users` 테이블 컬럼 추가 (Flyway V6__user_registration.sql)
  ```sql
  ALTER TABLE users ADD COLUMN account_status ENUM('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED') DEFAULT 'PENDING_APPROVAL';
  ALTER TABLE users ADD COLUMN approved_by BIGINT;
  ALTER TABLE users ADD COLUMN approved_at DATETIME;
  ALTER TABLE users ADD COLUMN rejected_reason TEXT;
  ALTER TABLE users ADD COLUMN registered_at DATETIME DEFAULT CURRENT_TIMESTAMP;
  ```
- [ ] `user_store` 매핑 테이블 생성 (매장 관리자 ↔ 매장 다대다)
  ```sql
  CREATE TABLE user_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    UNIQUE KEY uk_user_store (user_id, store_id)
  );
  ```
  - 한 매장에 여러 STORE_MANAGER 가능
  - 한 STORE_MANAGER가 여러 매장 담당 가능
  - is_primary: 매장의 주 담당자 표시
- [ ] 테스트: 마이그레이션 정상 적용 확인

### TASK-047 | 회원가입 API

- [ ] POST /api/v1/auth/register
  - Request: `{ email, password, passwordConfirm, name }`
  - 이메일 중복 체크
  - 비밀번호 일치 확인
  - 비밀번호 규칙 검증 (최소 8자, 영문+숫자+특수문자)
  - 비밀번호 BCrypt 해싱 저장
  - account_status = `PENDING_APPROVAL` 로 저장
- [ ] 로그인 시 account_status 체크
  - ACTIVE만 로그인 허용
  - PENDING_APPROVAL → "관리자 승인 대기 중입니다" 메시지
  - REJECTED → "가입이 거절되었습니다" 메시지
  - SUSPENDED → "계정이 정지되었습니다" 메시지
- [ ] 테스트: 회원가입 성공/중복이메일/비밀번호불일치 단위 테스트

### TASK-048 | 회원가입 React 화면

- [ ] /login 페이지 하단에 "회원가입" 링크 추가
  - 기존 로그인 폼 아래 구분선 + "계정이 없으신가요? 회원가입"
- [ ] /register 페이지
  - 이메일 입력 (실시간 중복 체크)
  - 비밀번호 입력 + 비밀번호 확인 입력
  - 비밀번호 강도 표시 (약함/보통/강함)
  - 이름 입력
  - 회원가입 버튼
  - "이미 계정이 있으신가요? 로그인" 링크
- [ ] 가입 완료 후 안내 화면
  - "가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다" 메시지
- [ ] 디자인: 기존 로그인 화면과 동일한 스타일, shadcn/ui 사용

---

## PHASE 16: 관리자 승인 & 역할 관리

### TASK-049 | 사용자 승인/역할 부여 API

- [ ] GET /api/v1/admin/users (사용자 목록)
  - 필터: account_status (PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED)
  - 필터: role (SUPER_ADMIN, BRAND_ADMIN, STORE_MANAGER)
  - 페이징, 검색 (이메일, 이름)
  - SUPER_ADMIN: 전체 사용자 조회 가능
  - BRAND_ADMIN: 본인 브랜드 소속 사용자만 조회
- [ ] GET /api/v1/admin/users/{id} (사용자 상세)
  - STORE_MANAGER인 경우 담당 매장 목록 포함
- [ ] PUT /api/v1/admin/users/{id}/approve (승인)
  - Request: `{ role, brandId?, storeIds? }`
  - 역할 부여 권한 체크:
    - SUPER_ADMIN → SUPER_ADMIN, BRAND_ADMIN, STORE_MANAGER 부여 가능
    - BRAND_ADMIN → BRAND_ADMIN, STORE_MANAGER 부여 가능 (본인 브랜드 내)
  - BRAND_ADMIN 부여 시: brandId 필수
  - STORE_MANAGER 부여 시: brandId + storeIds(배열) 필수
    - user_store 테이블에 매핑 레코드 생성
    - storeIds 중 첫 번째를 is_primary=true로 설정
  - account_status = `ACTIVE`로 변경
  - approved_by, approved_at 기록
- [ ] PUT /api/v1/admin/users/{id}/reject (거절)
  - Request: `{ reason }`
  - account_status = `REJECTED`
- [ ] 테스트: 역할별 권한 체크 통합 테스트

### TASK-050 | 사용자 정보 수정/삭제 API

- [ ] PUT /api/v1/admin/users/{id} (사용자 정보 수정)
  - 수정 가능: name, role, brandId, storeIds, account_status
  - 역할 변경 시 권한 체크 (TASK-049과 동일 규칙)
  - STORE_MANAGER 매장 변경 시:
    - 기존 user_store 매핑 삭제 → 새 storeIds로 재생성
    - 유효성 검증: storeIds가 DB에 존재하고 해당 브랜드 소속인지
- [ ] PUT /api/v1/admin/users/{id}/suspend (정지)
  - account_status = `SUSPENDED`
  - 정지된 사용자 JWT 즉시 무효화
- [ ] DELETE /api/v1/admin/users/{id} (비활성화, soft delete)
  - is_active = false
  - user_store 매핑도 함께 비활성화
  - hard delete 금지
- [ ] 테스트: 수정/정지/삭제 단위 테스트

### TASK-051 | 매장 관리자 매핑 API

- [ ] GET /api/v1/admin/stores/{storeId}/managers (매장별 관리자 목록)
  - 해당 매장에 배정된 STORE_MANAGER 목록 조회
  - is_primary 여부 표시
- [ ] PUT /api/v1/admin/stores/{storeId}/managers (매장 관리자 일괄 변경)
  - Request: `{ managerIds: [{ userId, isPrimary }] }`
  - 기존 매핑 전체 교체
- [ ] PUT /api/v1/admin/users/{id}/stores (사용자별 담당 매장 변경)
  - Request: `{ storeIds: [{ storeId, isPrimary }] }`
  - STORE_MANAGER의 담당 매장 추가/삭제
- [ ] 테스트: 다대다 매핑 CRUD 테스트

### TASK-052 | 브랜드/매장 선택 API (드롭다운용)

- [ ] GET /api/v1/admin/brands/select (브랜드 셀렉트 목록)
  - Response: `[{ id, name }]`
  - SUPER_ADMIN: 전체 브랜드
  - BRAND_ADMIN: 본인 브랜드만
- [ ] GET /api/v1/admin/stores/select?brandId={id} (매장 셀렉트 목록)
  - Response: `[{ id, name }]`
  - brandId에 해당하는 매장만 반환
- [ ] 테스트: 권한별 조회 범위 테스트

### TASK-053 | 관리자 사용자 관리 React 화면

- [ ] /settings/users — 사용자 관리 메인 페이지
  - 탭 또는 필터: 승인 대기 | 활성 | 거절 | 정지
  - 승인 대기 탭에 뱃지 (대기 인원수)
  - 테이블 컬럼: 이름, 이메일, 역할, 브랜드, 담당 매장, 상태, 가입일, 액션
  - STORE_MANAGER의 경우 담당 매장을 태그/뱃지로 복수 표시
  - 검색: 이메일/이름으로 검색
- [ ] 승인 대기 사용자 처리
  - "승인" 버튼 클릭 → 모달:
    - 역할 선택 드롭다운 (권한에 따라 선택 가능 역할만 표시)
    - BRAND_ADMIN 선택 시: 브랜드 드롭다운 표시 (DB에서 조회)
    - STORE_MANAGER 선택 시:
      - 브랜드 드롭다운
      - 매장 **다중 선택** 체크박스 또는 멀티셀렉트 (브랜드 연동)
      - 주 담당 매장 지정 라디오버튼
    - 확인 버튼 → 승인 완료
  - "거절" 버튼 → 사유 입력 모달 → 거절 처리
- [ ] 사용자 정보 수정
  - 테이블 행 클릭 또는 편집 아이콘 → 수정 모달
  - 이름, 역할, 브랜드, 담당 매장(복수) 수정 가능
  - 브랜드 변경 시 매장 드롭다운 자동 갱신
- [ ] 사용자 정지/삭제
  - "정지" 버튼 → 확인 모달 → 계정 정지
  - "삭제" 버튼 → 확인 모달 (되돌릴 수 없음 안내) → 비활성화
- [ ] 디자인: shadcn/ui Table, Dialog, Select, Badge, MultiSelect 사용

---

## 전체 흐름 요약

```
사용자                         시스템                        관리자
  │                             │                             │
  ├─ 회원가입 (이메일/PW) ────→│                             │
  │                             ├─ PENDING_APPROVAL 상태      │
  │                             │                             │
  │  로그인 시도                │                             │
  │  → "승인 대기 중" 안내     │                             │
  │                             │                             │
  │                             │  /settings/users 에서 확인  │
  │                             │←── 역할 + 매장 배정 + 승인 ─┤
  │                             │                             │
  │                             ├─ ACTIVE 상태 변경           │
  │                             │                             │
  ├─ 로그인 가능 ─────────────→│                             │
  │  (역할에 따라 화면 분기)    │                             │
```

### 매장 관리자 다대다 관계

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  김철수      │────→│  user_store  │←────│  강남점     │
│  STORE_MGR  │     │  is_primary  │     │             │
│             │──┐  └──────────────┘  ┌──│  역삼점     │
└─────────────┘  │  ┌──────────────┐  │  └─────────────┘
                 └─→│  user_store  │←─┘
┌─────────────┐     └──────────────┘
│  박영희      │────→┌──────────────┐
│  STORE_MGR  │     │  user_store  │←────  강남점
└─────────────┘     └──────────────┘

→ 강남점에 김철수 + 박영희 (복수 관리자)
→ 김철수는 강남점 + 역삼점 (복수 매장)
```

---

## 참고 사항 (Claude Code에게)

- 기존 RBAC 체계(TASK-005) 위에 확장. 기존 코드 깨뜨리지 말 것
- 비밀번호 해싱: Spring Security의 BCryptPasswordEncoder 사용
- STORE_MANAGER와 매장은 user_store 테이블로 다대다 관리
  - 기존 users.store_id 컬럼이 있다면 user_store로 마이그레이션
  - 매장별 재고/입고/발주 조회 시 user_store 기준으로 권한 체크
- JWT payload에 storeIds(배열)로 담당 매장 목록 포함
- JWT에 account_status 체크 추가: ACTIVE가 아니면 로그인 거부
- 모든 API는 `/api/v1/` prefix, `ApiResponse<T>` wrapper 사용
- soft delete 원칙 유지 (hard delete 금지)
- React: Tailwind CSS + shadcn/ui, 기존 컴포넌트 재사용
