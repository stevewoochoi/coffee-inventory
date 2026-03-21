# TASKS_V6_PRODUCTION_LAUNCH.md
# 아오야마 파일럿 매장 실운영 최종 고도화

> **작성일**: 2026-03-22
> **목적**: 아오야마 파일럿 매장에서 실제 운영이 가능한 수준으로 시스템을 최종 고도화한다.
> **핵심 원칙**: **기존 시스템을 절대 무너뜨리지 않는다.** 모든 변경은 additive(추가만)이다. 기존 API, 테이블 컬럼, 엔티티 필드는 건드리지 않는다.
> **집중 영역**: 매장 직원이 매일 5~10분 내에 정확하게 사용할 수 있는 실운영 핵심 기능
>
> **기준 문서**:
> - `PROJECT_SPECIFICATION_V1.md` — 현재 시스템 전체 명세
> - `pilot_store_ordering_inventory_execution_plan.md` — 파일럿 운영 요구사항 분석
> - `AOYAMA_INVENTORY.xlsx` — 아오야마 매장 72개 품목 목록

---

## ⚠️ 구현 전 반드시 숙지할 안전 규칙

```
1. Flyway 마이그레이션은 ADD COLUMN, CREATE TABLE만 사용한다.
   DROP, MODIFY, RENAME, ALTER COLUMN TYPE 절대 금지.

2. 기존 API 엔드포인트의 Response 구조를 변경하지 않는다.
   필드 추가는 허용, 기존 필드 제거/이름변경 금지.

3. 기존 엔티티 필드를 삭제하거나 타입을 변경하지 않는다.
   새 필드 추가만 허용.

4. 기존 서비스 메서드의 시그니처를 변경하지 않는다.
   새 메서드 추가는 허용.

5. 현재 최신 Flyway 버전은 V34이다. 신규 파일은 V35부터 시작한다.
   ARCHITECT가 실제 최신 버전을 현장에서 재확인한 후 진행한다.

6. 기존 53개 테스트가 모두 통과해야 한다. 구현 후 mvn test 필수.
```

---

## Agent Teams 설정

### settings.json (프로젝트 루트에 적용)

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
      "Bash(java *)",
      "Bash(curl *)"
    ]
  }
}
```

### Claude Code 실행 프롬프트 (터미널에 붙여넣기)

```
docs/TASKS_V6_PRODUCTION_LAUNCH.md를 읽고 아오야마 파일럿 매장 실운영 고도화를 에이전트 팀으로 구현해줘.

프로젝트 경로: /home/ubuntu/coffee-inventory
스택: Spring Boot 3.2.5 + JPA + Flyway + MySQL 8 + React 19 + TypeScript + Tailwind + shadcn/ui
현재 Flyway 최신 버전: V34 (실제 파일 목록 확인 후 다음 번호 사용)
API 패턴: ApiResponse<T>, /api/v1/
기존 테스트: 53개, 모두 통과 상태 유지 필수

=== 3인 에이전트 팀 ===

■ ARCHITECT — delegate mode (코드 직접 작성 X, 조율/검토만)
■ BACKEND   — DB 마이그레이션, 서비스, API 구현
■ FRONTEND  — React 페이지 및 컴포넌트 구현

우선순위 순서: PHASE P0 완전 완료 → PHASE P1 → PHASE P2
각 PHASE 완료 시: mvn test 통과 확인 → git add . && git commit → 다음 PHASE 진행
```

---

---

# ■ ARCHITECT 지시사항

## 1. 시작 전 필수 현황 파악

BACKEND, FRONTEND 작업 시작 전에 반드시 아래를 직접 확인하고 각 에이전트에게 전달한다.

### 1-A. 백엔드 파악 (BACKEND에게 전달)

```bash
# Flyway 현재 최신 버전 확인
ls backend/src/main/resources/db/migration/ | sort

# Item 엔티티 현재 필드 전체 확인 (중복 추가 방지)
cat backend/src/main/java/com/coffee/entity/Item.java

# 기존 실사 관련 엔티티 확인
cat backend/src/main/java/com/coffee/entity/PhysicalCount.java
cat backend/src/main/java/com/coffee/entity/PhysicalCountLine.java
cat backend/src/main/java/com/coffee/entity/DailyPhysicalCount.java

# 기존 재고 서비스 확인
cat backend/src/main/java/com/coffee/service/InventoryService.java

# 기존 발주 추천 서비스 확인
cat backend/src/main/java/com/coffee/service/OrderSuggestionService.java

# 기존 컨트롤러 목록
ls backend/src/main/java/com/coffee/controller/

# 기존 ApiResponse 패턴 확인
cat backend/src/main/java/com/coffee/dto/ApiResponse.java 2>/dev/null || \
find backend/src -name "ApiResponse.java" -exec cat {} \;

# 기존 Security 설정의 공개/인증 패턴 확인
find backend/src -name "SecurityConfig.java" -exec cat {} \;
```

### 1-B. 프론트엔드 파악 (FRONTEND에게 전달)

```bash
# 라우팅 구조 확인
cat frontend/src/App.tsx

# 기존 ordering API 모듈 확인
cat frontend/src/api/ordering.ts

# 기존 inventory API 모듈 확인
cat frontend/src/api/inventory.ts

# 기존 master API 모듈 확인
cat frontend/src/api/master.ts

# 매장 발주 페이지 현재 상태 확인
cat frontend/src/pages/store/ordering/NewOrderPage.tsx 2>/dev/null || \
find frontend/src/pages/store -name "*.tsx" | head -20

# 매장 입고 페이지 현재 상태 확인
cat frontend/src/pages/store/ReceivingPage.tsx 2>/dev/null || true

# 매장 대시보드 페이지 현재 상태 확인
cat frontend/src/pages/store/DashboardPage.tsx 2>/dev/null || true

# i18n 번역 파일 구조 확인
ls frontend/src/locales/
cat frontend/src/locales/ko/translation.json | head -60

# 기존 shadcn/ui 컴포넌트 목록
ls frontend/src/components/ui/ 2>/dev/null || ls frontend/src/components/

# StoreLayout 확인
find frontend/src -name "StoreLayout.tsx" -exec cat {} \;
```

### 1-C. ARCHITECT의 BACKEND/FRONTEND 지시 원칙

- BACKEND에게 반드시 전달: 현재 최신 Flyway 버전 번호, Item 엔티티 현재 필드 목록
- FRONTEND에게 반드시 전달: 기존 라우팅 패턴, API 호출 패턴 (axios 인터셉터 포함)
- 각 에이전트의 plan 검토 후 승인: 기존 시스템 충돌 여부 먼저 확인
- 각 Phase 완료 시: `mvn test` 결과 확인, 기존 53개 테스트 통과 여부 확인
- git commit 형식: `[V6-P0A] Item 운영 필드 DB 마이그레이션`

---

---

# ■ BACKEND 지시사항

> **작업 원칙**: 기존 코드를 수정할 때는 최소한으로. 새 클래스/메서드 추가 우선.
> 기존 서비스를 extends하거나 별도 서비스로 분리하는 방식을 선호한다.

---

## PHASE P0-A: Item 운영 마스터 필드 추가 (DB 마이그레이션)

### 목적
현재 `Item` 엔티티는 상품 등록 관점의 필드만 있다. 실운영을 위해 재고관리 강도(A/B/C), 보관구역, 발주/재고단위 분리, 실사주기 등 운영 마스터 필드를 추가한다.

### 사전 확인 필수
아래 필드들이 `Item` 엔티티에 이미 있는지 확인하고, 있으면 해당 ADD COLUMN은 건너뛴다:
- `temperature_zone` → 이미 있음 (기존 필드). `storage_zone`은 별도 추가
- `min_stock_qty` → 이미 있음 (기존 필드). `par_level`, `safety_stock`은 별도 추가
- `lead_time_days` → 이미 있음 (기존 필드). `count_cycle` 등은 별도 추가

### Flyway 마이그레이션 파일
**파일명**: `V{현재최신+1}__item_operational_fields.sql`
(ARCHITECT가 알려준 실제 버전 번호 사용. 현재 V34가 최신이면 V35 사용)

```sql
-- =====================================================
-- V35: Item 운영 마스터 필드 추가 (additive only)
-- 기존 컬럼 변경/삭제 없음
-- =====================================================

-- 1. items 테이블 운영 필드 추가
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS stock_unit VARCHAR(20) DEFAULT 'ea'
    COMMENT '실재고 차감단위 (g/ml/ea/pack). 기존 base_unit과 별개로 현장 운영 단위',
  ADD COLUMN IF NOT EXISTS order_unit VARCHAR(20) DEFAULT 'ea'
    COMMENT '발주단위 (box/bag/pack/bottle/sleeve/roll/ea 등)',
  ADD COLUMN IF NOT EXISTS conversion_qty DECIMAL(12,3) DEFAULT 1.000
    COMMENT '1 order_unit 당 stock_unit 수량. 예: 우유 1pack=1000ml → 1000.000',
  ADD COLUMN IF NOT EXISTS min_order_qty INT DEFAULT 1
    COMMENT '최소 발주수량 (order_unit 기준). 예: 2박스 미만 발주 불가 → 2',
  ADD COLUMN IF NOT EXISTS par_level DECIMAL(12,3) DEFAULT 0.000
    COMMENT '목표 재고량 (stock_unit 기준). 발주 추천의 목표값',
  ADD COLUMN IF NOT EXISTS count_cycle VARCHAR(20) DEFAULT 'WEEKLY'
    COMMENT '실사 주기. DAILY/TWICE_WEEKLY/WEEKLY/MONTHLY',
  ADD COLUMN IF NOT EXISTS storage_zone VARCHAR(20) DEFAULT 'AMBIENT'
    COMMENT '보관구역. REFRIGERATED/FROZEN/AMBIENT/SUPPLIES. 실사 동선 기준',
  ADD COLUMN IF NOT EXISTS item_grade VARCHAR(5) DEFAULT 'B'
    COMMENT '재고관리 등급. A=매일관리/B=주2회/C=주1회. 대시보드/실사 필터 기준',
  ADD COLUMN IF NOT EXISTS substitute_item_id BIGINT NULL
    COMMENT '품절 시 대체 가능한 item_id',
  ADD COLUMN IF NOT EXISTS lot_tracking VARCHAR(20) DEFAULT 'NONE'
    COMMENT '로트추적 수준. FULL=로트+유통기한/EXP_ONLY=유통기한만/NONE=추적안함',
  ADD COLUMN IF NOT EXISTS daily_usage_avg DECIMAL(12,3) DEFAULT 0.000
    COMMENT '최근 7일 일평균 소비량 (stock_unit 기준). 자동갱신 스케줄러가 업데이트',
  ADD COLUMN IF NOT EXISTS is_pos_tracked BOOLEAN DEFAULT FALSE
    COMMENT 'POS 자동차감 대상 여부. TRUE면 PosSales 기록 시 재고 차감됨';

-- 2. 인덱스 추가 (필터/정렬 성능)
CREATE INDEX IF NOT EXISTS idx_items_item_grade ON items(item_grade);
CREATE INDEX IF NOT EXISTS idx_items_storage_zone ON items(storage_zone);
CREATE INDEX IF NOT EXISTS idx_items_count_cycle ON items(count_cycle);

-- =====================================================
-- V{N+1}: Cycle Count 세션 테이블 생성 (새 테이블)
-- 기존 physical_count와 별개: 등급/구역 필터 기반 단시간 실사
-- =====================================================

-- 3. cycle_count_session 테이블
CREATE TABLE IF NOT EXISTS cycle_count_session (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id        BIGINT NOT NULL,
  grade_filter    VARCHAR(5)  NULL COMMENT 'A/B/C/ALL. NULL이면 필터 없음',
  zone_filter     VARCHAR(20) NULL COMMENT 'REFRIGERATED/FROZEN/AMBIENT/SUPPLIES/ALL',
  status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
                  COMMENT 'IN_PROGRESS/COMPLETED/CANCELLED',
  counted_by      BIGINT NULL COMMENT 'users.id',
  item_count      INT DEFAULT 0 COMMENT '대상 품목 수',
  completed_count INT DEFAULT 0 COMMENT '실사 완료 품목 수',
  started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME NULL,
  note            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccs_store FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- 4. cycle_count_line 테이블
CREATE TABLE IF NOT EXISTS cycle_count_line (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id      BIGINT NOT NULL,
  item_id         BIGINT NOT NULL,
  system_qty      DECIMAL(12,3) NULL COMMENT '실사 시작 시점 시스템 현재고',
  counted_qty     DECIMAL(12,3) NULL COMMENT '실측 수량. NULL=미입력',
  variance_qty    DECIMAL(12,3) NULL COMMENT '차이 (counted - system)',
  stock_unit      VARCHAR(20)   NULL COMMENT '단위 (item.stock_unit 복사)',
  storage_zone    VARCHAR(20)   NULL COMMENT '보관구역 (item.storage_zone 복사)',
  item_grade      VARCHAR(5)    NULL COMMENT '등급 (item.item_grade 복사)',
  is_adjusted     BOOLEAN DEFAULT FALSE COMMENT '조정 완료 여부',
  adjusted_at     DATETIME NULL,
  note            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccl_session FOREIGN KEY (session_id) REFERENCES cycle_count_session(id),
  CONSTRAINT fk_ccl_item    FOREIGN KEY (item_id)    REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_ccs_store_status ON cycle_count_session(store_id, status);
CREATE INDEX IF NOT EXISTS idx_ccl_session ON cycle_count_line(session_id);
CREATE INDEX IF NOT EXISTS idx_ccl_item ON cycle_count_line(item_id);
```

**주의**: `items` 테이블명이 실제 DB에서 `item`인지 `items`인지 ARCHITECT가 먼저 확인해서 알려준다.

### Java 엔티티 수정 (Item.java)

기존 `Item.java` 파일에 아래 필드를 **추가**한다. 기존 필드는 절대 건드리지 않는다.

```java
// ── 운영 마스터 필드 (V6 추가, 2026-03-22) ──────────────────────────────

/** 실재고 차감단위. g/ml/ea/pack 등. 기존 baseUnit과 별개로 현장 운영용. */
@Column(name = "stock_unit", length = 20)
private String stockUnit = "ea";

/** 발주단위. box/bag/pack/bottle/sleeve/roll/ea 등. */
@Column(name = "order_unit", length = 20)
private String orderUnit = "ea";

/** 1 orderUnit 당 stockUnit 수량. 예: 우유 1pack=1000ml이면 1000.000 */
@Column(name = "conversion_qty", precision = 12, scale = 3)
private BigDecimal conversionQty = BigDecimal.ONE;

/** 최소 발주수량 (orderUnit 기준). */
@Column(name = "min_order_qty")
private Integer minOrderQty = 1;

/** 목표 재고량 (stockUnit 기준). 발주 추천의 목표값. */
@Column(name = "par_level", precision = 12, scale = 3)
private BigDecimal parLevel = BigDecimal.ZERO;

/** 실사 주기. DAILY / TWICE_WEEKLY / WEEKLY / MONTHLY */
@Column(name = "count_cycle", length = 20)
private String countCycle = "WEEKLY";

/** 보관구역. REFRIGERATED / FROZEN / AMBIENT / SUPPLIES */
@Column(name = "storage_zone", length = 20)
private String storageZone = "AMBIENT";

/** 재고관리 등급. A=매일 / B=주2회 / C=주1회 */
@Column(name = "item_grade", length = 5)
private String itemGrade = "B";

/** 품절 시 대체 가능한 item_id */
@Column(name = "substitute_item_id")
private Long substituteItemId;

/** 로트추적 수준. FULL / EXP_ONLY / NONE */
@Column(name = "lot_tracking", length = 20)
private String lotTracking = "NONE";

/** 최근 7일 일평균 소비량 (stockUnit 기준). 스케줄러가 자동갱신. */
@Column(name = "daily_usage_avg", precision = 12, scale = 3)
private BigDecimal dailyUsageAvg = BigDecimal.ZERO;

/** POS 자동차감 대상 여부. */
@Column(name = "is_pos_tracked")
private Boolean isPosTracked = false;

// Getter/Setter 추가 (Lombok 사용 시 생략)
```

### 신규 엔티티 생성

`CycleCountSession.java`, `CycleCountLine.java` 파일을 `entity/` 패키지에 새로 생성한다.
기존 `PhysicalCount.java` 패턴을 참고해서 동일한 방식으로 작성한다.

---

## PHASE P0-B: 아오야마 72개 품목 시드 데이터

### 목적
아오야마 파일럿 매장에서 즉시 운영할 수 있도록 72개 품목을 운영 마스터 필드 포함하여 DB에 등록한다.

### 전제조건
- P0-A 마이그레이션이 먼저 완료되어야 한다.
- 기존에 동일 brandId로 같은 이름의 품목이 있을 수 있다. INSERT IGNORE 또는 ON DUPLICATE KEY UPDATE 사용.
- `brand_id`, `supplier_id` 등 실제 DB의 ID 값은 ARCHITECT가 아래 쿼리로 확인한다:

```sql
-- 실제 brand_id 확인
SELECT id, name FROM brands LIMIT 10;

-- 실제 category 확인 (없으면 먼저 생성)
SELECT id, name FROM item_categories WHERE brand_id = {실제brand_id};
```

### 카테고리 시드 (없는 경우 생성)

```sql
-- 파일럿용 카테고리 (brand_id는 실제 값으로 교체)
INSERT IGNORE INTO item_categories (brand_id, name, parent_id, display_order, created_at)
VALUES
  ({BRAND_ID}, '냉장/신선',  NULL, 10, NOW()),
  ({BRAND_ID}, '냉동',      NULL, 20, NOW()),
  ({BRAND_ID}, '원두',       NULL, 30, NOW()),
  ({BRAND_ID}, '파우더/티',  NULL, 40, NOW()),
  ({BRAND_ID}, '시럽/소스/퓨레', NULL, 50, NOW()),
  ({BRAND_ID}, '컵/용기',    NULL, 60, NOW()),
  ({BRAND_ID}, '소모품',     NULL, 70, NOW());
```

### 품목 시드 SQL

아래 데이터로 72개 품목 INSERT 구문을 작성한다.
각 품목의 `item_grade`, `storage_zone`, `stock_unit`, `order_unit`, `conversion_qty`, `count_cycle`, `lot_tracking`, `is_pos_tracked` 값을 포함한다.

**운영 분류 기준표** (이 표를 기반으로 INSERT SQL 작성):

| name_ko | name_ja | grade | zone | stock_unit | order_unit | conv_qty | count_cycle | lot_tracking | pos_tracked |
|---|---|---|---|---|---|---|---|---|---|
| 우유 | 牛乳 | A | REFRIGERATED | ml | pack | 1000 | DAILY | EXP_ONLY | true |
| 생크림 | 生クリーム | A | REFRIGERATED | ml | pack | 200 | DAILY | EXP_ONLY | true |
| 탄산수 | 炭酸水 | A | REFRIGERATED | ml | bottle | 500 | DAILY | NONE | true |
| 오렌지주스 | オレンジジュース | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 레몬즙 | レモン汁 | B | REFRIGERATED | ml | bottle | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 연유 | 練乳 | B | REFRIGERATED | g | tube | 150 | TWICE_WEEKLY | EXP_ONLY | true |
| 레몬 | レモン | B | REFRIGERATED | ea | ea | 1 | TWICE_WEEKLY | EXP_ONLY | false |
| 냉동딸기 | 冷凍イチゴ | A | FROZEN | g | bag | 1000 | DAILY | EXP_ONLY | true |
| 냉동딸기 다이스 | 冷凍イチゴダイス | A | FROZEN | g | bag | 1000 | DAILY | EXP_ONLY | true |
| 믹스베리 다이스 | ミックスベリーダイス | A | FROZEN | g | bag | 1000 | DAILY | EXP_ONLY | true |
| 와플냉동생지 | ワッフル冷凍生地 | A | FROZEN | ea | bag | 20 | DAILY | EXP_ONLY | true |
| 다크원두 | ダーク豆 | A | AMBIENT | g | bag | 1000 | DAILY | EXP_ONLY | true |
| 프루티원두 | フルーティー豆 | A | AMBIENT | g | bag | 1000 | DAILY | EXP_ONLY | true |
| 설탕 | グラニュー糖 | C | AMBIENT | g | bag | 1000 | WEEKLY | NONE | false |
| 소금 | 塩 | C | AMBIENT | g | bag | 500 | WEEKLY | NONE | false |
| 가당말차라떼파우더 | 抹茶ラテパウダー | B | AMBIENT | g | bag | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 무당말차파우더 | 無糖抹茶パウダー | B | AMBIENT | g | bag | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 코코아 파우더 | ココアパウダー | B | AMBIENT | g | bag | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 무당코코아파우더 | 無糖ココアパウダー | B | AMBIENT | g | bag | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 블랙코코아파우더 | ブラックココアパウダー | B | AMBIENT | g | bag | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 요거트파우더 | ヨーグルトパウダー | B | AMBIENT | g | bag | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 율무차파우더 | ユルムパウダー | B | AMBIENT | g | bag | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 얼그레이 | アールグレイ | B | AMBIENT | g | bag | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 잉글리쉬블랙퍼스트 | イングリッシュブラックファースト | B | AMBIENT | g | bag | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 얼그레이티백 | アールグレイティーバッグ | B | AMBIENT | ea | box | 25 | TWICE_WEEKLY | EXP_ONLY | true |
| 다즐링티백 | ダージリンティーバッグ | B | AMBIENT | ea | box | 25 | TWICE_WEEKLY | EXP_ONLY | true |
| 히비스커스티백 | ハイビスカスティーバッグ | B | AMBIENT | ea | box | 25 | TWICE_WEEKLY | EXP_ONLY | true |
| 캐모마일티백 | カモミールティーバッグ | B | AMBIENT | ea | box | 25 | TWICE_WEEKLY | EXP_ONLY | true |
| 초코소스 | チョコソース | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 카라멜소스 | キャラメルソース | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 캬라멜시럽 | キャラメルシロップ | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 바닐라시럽 | バニラシロップ | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 마카다미아시럽 | マカダミアシロップ | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 헤이즐넛시럽 | ヘーゼルナッツシロップ | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 로즈시럽 | ローズシロップ | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 블루베리퓨레 | ブルーベリーピューレ | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 딸기퓨레 | イチゴピューレ | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 리치퓨레 | ライチピューレ | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 오렌지퓨레 | オレンジピューレ | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 라즈베리퓨레 | ラズベリーピューレ | B | REFRIGERATED | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | true |
| 사과베이스 | アップルベース | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | false |
| 배베이스 | 梨ベース | B | AMBIENT | ml | bottle | 1000 | TWICE_WEEKLY | EXP_ONLY | false |
| 유자청 | ユズジャム | B | REFRIGERATED | g | jar | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 자몽청 | グレープフルーツジャム | B | REFRIGERATED | g | jar | 500 | TWICE_WEEKLY | EXP_ONLY | true |
| 나타드코코 | ナタデココ | C | AMBIENT | g | can | 500 | WEEKLY | EXP_ONLY | false |
| 검시럽포션 | ガムシロップポーション | C | AMBIENT | ea | box | 50 | WEEKLY | NONE | false |
| 프림포션 | グリムポーション | C | AMBIENT | ea | box | 50 | WEEKLY | NONE | false |
| 핫컵 12온즈 | ホットカップ 12オンス | A | SUPPLIES | ea | sleeve | 50 | DAILY | NONE | false |
| 핫컵 16온즈 | ホットカップ 16オンス | A | SUPPLIES | ea | sleeve | 50 | DAILY | NONE | false |
| 핫컵 뚜껑 | ホットカップの蓋 | A | SUPPLIES | ea | sleeve | 100 | DAILY | NONE | false |
| 아이스컵 14온즈 | アイスカップ 14オンス | A | SUPPLIES | ea | sleeve | 50 | DAILY | NONE | false |
| 아이스컵 14온즈 뚜껑 | アイスカップ 14オンス 蓋 | A | SUPPLIES | ea | sleeve | 100 | DAILY | NONE | false |
| 아이스컵 22온즈 | アイスカップ 22オンス | A | SUPPLIES | ea | sleeve | 50 | DAILY | NONE | false |
| 아이스컵 22온즈 뚜껑 | アイスカップ 22オンス 蓋 | A | SUPPLIES | ea | sleeve | 100 | DAILY | NONE | false |
| 컵홀더 | カップホルダー | B | SUPPLIES | ea | pack | 100 | TWICE_WEEKLY | NONE | false |
| 캐리어 | キャリア | B | SUPPLIES | ea | pack | 50 | TWICE_WEEKLY | NONE | false |
| 빨대 | ストロー | A | SUPPLIES | ea | pack | 200 | DAILY | NONE | false |
| 두꺼운 빨대 | 太いストロー | B | SUPPLIES | ea | pack | 200 | TWICE_WEEKLY | NONE | false |
| 포크 | フォーク | C | SUPPLIES | ea | pack | 100 | WEEKLY | NONE | false |
| 나이프 | ナイフ | C | SUPPLIES | ea | pack | 100 | WEEKLY | NONE | false |
| 핫용 머들러 | マドラー | C | SUPPLIES | ea | pack | 200 | WEEKLY | NONE | false |
| 물티슈 | ウェットティッシュ | C | SUPPLIES | ea | box | 100 | WEEKLY | NONE | false |
| 냅킨 | ナプキン | C | SUPPLIES | ea | pack | 300 | WEEKLY | NONE | false |
| 로고스티커 | ロゴシール | C | SUPPLIES | ea | roll | 500 | WEEKLY | NONE | false |
| 와플 봉투 | ワッフル袋 | B | SUPPLIES | ea | pack | 200 | TWICE_WEEKLY | NONE | false |
| 손잡이봉투 (소) | 手提げ袋（小） | C | SUPPLIES | ea | pack | 100 | WEEKLY | NONE | false |
| 손잡이봉투 (중) | 手提げ袋（中） | C | SUPPLIES | ea | pack | 100 | WEEKLY | NONE | false |
| 쓰레기봉투 | ゴミ袋 | C | SUPPLIES | ea | roll | 30 | WEEKLY | NONE | false |
| 니트릴장갑 S | ニトリル手袋 S | C | SUPPLIES | ea | box | 100 | WEEKLY | NONE | false |
| 니트릴장갑 M | ニトリル手袋 M | C | SUPPLIES | ea | box | 100 | WEEKLY | NONE | false |
| 니트릴장갑 L | ニトリル手袋 L | C | SUPPLIES | ea | box | 100 | WEEKLY | NONE | false |
| 차백 | 茶バック | C | SUPPLIES | ea | pack | 100 | WEEKLY | NONE | false |

**시드 SQL 주의사항**:
- `INSERT IGNORE`를 사용해 중복 실행 시 오류 방지
- `brand_id`는 실제 값으로 교체 (ARCHITECT가 제공)
- `category_id`는 위에서 생성한 카테고리 ID로 교체
- `is_active = true`, `is_orderable = true` 기본값 설정
- `temperature_zone`은 기존 필드이므로 zone에 맞게 설정:
  REFRIGERATED → 'COLD', FROZEN → 'FROZEN', AMBIENT → 'AMBIENT', SUPPLIES → 'AMBIENT'

---

## PHASE P0-C: Item 운영 필드 PATCH API

### 목적
BRAND_ADMIN이 item 등록 후 운영 필드(grade, zone, units 등)를 한 번에 설정할 수 있는 전용 API.
기존 `PUT /api/v1/master/items/{id}` API는 변경하지 않는다. 별도 엔드포인트 추가.

### DTO 생성

`dto/request/ItemOperationalRequest.java`:

```java
public record ItemOperationalRequest(
    String  stockUnit,       // "g"/"ml"/"ea" 등
    String  orderUnit,       // "box"/"bag"/"pack" 등
    Double  conversionQty,   // 1 orderUnit당 stockUnit 수량
    Integer minOrderQty,     // 최소 발주수량
    Double  parLevel,        // 목표재고 (stock_unit 기준)
    String  countCycle,      // "DAILY"/"TWICE_WEEKLY"/"WEEKLY"/"MONTHLY"
    String  storageZone,     // "REFRIGERATED"/"FROZEN"/"AMBIENT"/"SUPPLIES"
    String  itemGrade,       // "A"/"B"/"C"
    Long    substituteItemId,// 대체품 item_id (nullable)
    String  lotTracking,     // "FULL"/"EXP_ONLY"/"NONE"
    Boolean isPosTracked     // POS 자동차감 여부
) {}
```

`dto/response/ItemOperationalResponse.java`:
- 기존 `ItemResponse`를 extends하거나, 기존 응답에 운영 필드를 추가한 응답 클래스

### 서비스 메서드 추가

기존 `ItemService.java`에 메서드 추가 (또는 별도 `ItemOperationalService.java` 생성):

```java
/**
 * Item 운영 마스터 필드만 업데이트.
 * 기존 updateItem() 메서드는 건드리지 않음.
 */
public ItemResponse updateItemOperational(Long itemId, ItemOperationalRequest request) {
    Item item = itemRepository.findById(itemId)
        .orElseThrow(() -> new EntityNotFoundException("Item not found: " + itemId));

    // validation: countCycle 값 검증
    List<String> validCycles = List.of("DAILY", "TWICE_WEEKLY", "WEEKLY", "MONTHLY");
    if (request.countCycle() != null && !validCycles.contains(request.countCycle())) {
        throw new IllegalArgumentException("Invalid countCycle: " + request.countCycle());
    }

    // 운영 필드만 업데이트 (null이면 기존 값 유지)
    if (request.stockUnit()    != null) item.setStockUnit(request.stockUnit());
    if (request.orderUnit()    != null) item.setOrderUnit(request.orderUnit());
    if (request.conversionQty()!= null) item.setConversionQty(BigDecimal.valueOf(request.conversionQty()));
    if (request.minOrderQty()  != null) item.setMinOrderQty(request.minOrderQty());
    if (request.parLevel()     != null) item.setParLevel(BigDecimal.valueOf(request.parLevel()));
    if (request.countCycle()   != null) item.setCountCycle(request.countCycle());
    if (request.storageZone()  != null) item.setStorageZone(request.storageZone());
    if (request.itemGrade()    != null) item.setItemGrade(request.itemGrade());
    item.setSubstituteItemId(request.substituteItemId()); // null 허용
    if (request.lotTracking()  != null) item.setLotTracking(request.lotTracking());
    if (request.isPosTracked() != null) item.setIsPosTracked(request.isPosTracked());

    return toResponse(itemRepository.save(item));
}
```

### 컨트롤러 엔드포인트 추가

기존 `ItemController.java`에 메서드 추가:

```java
/**
 * PATCH /api/v1/master/items/{id}/operational
 * 운영 마스터 필드만 업데이트. 기존 PUT /{id} 와 별개.
 */
@PatchMapping("/{id}/operational")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY')")
public ResponseEntity<ApiResponse<ItemResponse>> updateItemOperational(
        @PathVariable Long id,
        @RequestBody @Valid ItemOperationalRequest request) {
    return ResponseEntity.ok(ApiResponse.success(
        itemService.updateItemOperational(id, request)
    ));
}
```

### 기존 GET /api/v1/master/items Response 확장

기존 `ItemResponse`에 운영 필드를 추가한다.
**중요**: 기존 필드는 유지하고, 신규 필드는 nullable로 추가해서 기존 클라이언트 호환성 유지.

```java
// ItemResponse에 추가 (기존 필드 유지)
private String  stockUnit;
private String  orderUnit;
private Double  conversionQty;
private Integer minOrderQty;
private Double  parLevel;
private String  countCycle;
private String  storageZone;
private String  itemGrade;
private Long    substituteItemId;
private String  lotTracking;
private Double  dailyUsageAvg;
private Boolean isPosTracked;
```

---

## PHASE P0-D: Cycle Count API (등급/구역 기반 실사)

### 목적
기존 `PhysicalCount`(전수 실사)와 별개로, 매일 5분 만에 A등급 품목만 실사하는 Cycle Count 세션 API.
`cycle_count_session`, `cycle_count_line` 테이블 기반.

### 서비스 생성: `CycleCountService.java`

```java
@Service
@Transactional
@RequiredArgsConstructor
public class CycleCountService {

    /**
     * Cycle Count 세션 시작.
     * grade_filter (A/B/C/null) 또는 zone_filter로 대상 품목 자동 생성.
     */
    public CycleCountSessionResponse startSession(
            Long storeId, String gradeFilter, String zoneFilter, Long userId) {
        // 1. 대상 품목 쿼리: items 테이블에서 grade/zone 필터 적용
        //    단, is_active = true인 품목만
        // 2. 현시점 inventory_snapshot에서 각 품목의 현재고 조회
        //    (여러 lot가 있으면 합산)
        // 3. CycleCountSession 생성 (status=IN_PROGRESS)
        // 4. CycleCountLine 일괄 생성 (counted_qty=null, system_qty=현재고)
        // 5. 응답 반환
    }

    /**
     * 실사 수량 입력. counted_qty가 null이면 "미입력" 상태.
     */
    public CycleCountLineResponse updateLine(Long lineId, Double countedQty, String note) {
        // 1. line 조회
        // 2. counted_qty, variance_qty = countedQty - systemQty 계산
        // 3. 저장
        // 4. session.completed_count 갱신
    }

    /**
     * 세션 완료. 차이 있는 품목 재고 조정 선택 가능.
     */
    public CycleCountSessionResponse completeSession(
            Long sessionId, Boolean applyAdjustments) {
        // 1. 모든 line의 counted_qty가 입력되었는지 확인
        // 2. applyAdjustments=true이면:
        //    - variance != 0인 품목에 대해 InventoryService.recordStockChange() 호출
        //    - type: ADJUST, memo: "Cycle Count #{sessionId}"
        //    - is_adjusted = true 마킹
        // 3. session.status = COMPLETED, completed_at = now
    }

    /**
     * 완료되지 않은 세션 목록 조회 (in-progress).
     */
    public List<CycleCountSessionResponse> getActiveSessions(Long storeId) { ... }

    /**
     * 세션 상세 조회 (라인 포함).
     */
    public CycleCountSessionDetailResponse getSession(Long sessionId) { ... }

    /**
     * 세션 이력 조회.
     */
    public Page<CycleCountSessionResponse> getHistory(Long storeId, Pageable pageable) { ... }
}
```

### 컨트롤러 생성: `CycleCountController.java`

```
POST   /api/v1/cycle-count/sessions
       ?storeId={id}&gradeFilter={A|B|C}&zoneFilter={zone}
       → 세션 시작, 대상 품목 라인 자동생성

GET    /api/v1/cycle-count/sessions?storeId={id}&status={IN_PROGRESS|COMPLETED}
       → 세션 목록

GET    /api/v1/cycle-count/sessions/{sessionId}
       → 세션 상세 + 라인 목록

PUT    /api/v1/cycle-count/sessions/{sessionId}/lines/{lineId}
       Body: { "countedQty": 2.5, "note": "1박스 = 1000ml" }
       → 실사 수량 입력

POST   /api/v1/cycle-count/sessions/{sessionId}/complete
       Body: { "applyAdjustments": true }
       → 완료 처리 + 재고 조정 선택 실행

권한: STORE_MANAGER, KR_INVENTORY, BRAND_ADMIN
```

**중요**: `applyAdjustments=true`일 때 `InventoryService.recordStockChange()` 호출 방식은
기존 `PhysicalCountService.complete()`가 재고 조정을 처리하는 방식과 동일하게 구현.
기존 코드를 먼저 확인하고 동일한 패턴을 따른다.

---

## PHASE P0-E: 발주 추천 로직 투명성 강화

### 목적
기존 `OrderSuggestionService.suggest()` 결과에 "추천 근거"를 추가한다.
매장 직원이 "왜 2박스 추천인지" 이해할 수 있어야 한다.
기존 API Response를 변경하되, 기존 필드는 유지하고 필드만 추가한다.

### 기존 `/api/v1/ordering/suggestion` Response에 필드 추가

현재 response를 먼저 확인하고, 아래 필드를 추가한다:

```java
// OrderSuggestionResponse 또는 기존 응답 클래스에 추가
private Double  currentStock;       // 현재 재고 (stock_unit)
private Double  parLevel;           // 목표 재고 (stock_unit)
private Double  dailyUsageAvg;      // 일평균 소비량
private Double  daysUntilEmpty;     // 현재고로 버티는 일수
private Integer leadTimeDays;       // 리드타임 (일)
private Double  leadTimeConsumption;// 리드타임 동안 소비 예상량
private String  stockUnit;          // 재고 단위
private String  orderUnit;          // 발주 단위
private Integer minOrderQty;        // 최소 발주수량
private String  recommendationBasis;// 추천 근거 텍스트
                                    // 예: "현재 2.5kg / 목표 8kg / 일 1.2kg 사용"

// 추천 수량 계산 공식 (현재 로직 개선):
// needed = parLevel - currentStock + (leadTimeDays * dailyUsageAvg)
// suggestedOrderQty = ceil(needed / conversionQty)
// minOrderQty 이상으로 올림
```

### 기존 `/api/v1/ordering/needs` Response에도 동일 필드 추가

두 엔드포인트 모두 동일한 풍부한 정보를 반환하도록 개선.

### 일평균 소비량 자동갱신 스케줄러

기존 `ExpiryAlertScheduler` 패턴을 참고하여 새 스케줄러 생성:

`DailyUsageAvgScheduler.java`:
```java
// 매일 새벽 03:00 실행
// 각 item별로 최근 7일 stock_ledger에서 SELL, WASTE 타입 합산
// items.daily_usage_avg 업데이트
// 전체 brand의 모든 active item 대상
@Scheduled(cron = "0 0 3 * * *")
```

---

## PHASE P0-F: 빠른 입고(Quick Receive) API

### 목적
현재 입고 프로세스는 바코드 스캔 중심 단일 플로우. 실제 카페에서는 "발주대로 다 왔어요" 한 번 탭으로 입고가 끝나야 한다.
기존 `DeliveryService`와 `DeliveryController`는 변경하지 않고, 신규 엔드포인트 추가.

### 신규 API 엔드포인트

```
POST /api/v1/receiving/deliveries/{id}/quick-confirm
Body: {
  "lines": [
    {
      "packagingId": 7,
      "receivedQty": 3,      // 실제 받은 수량 (pack 기준)
      "expDate": "2026-06-30" // nullable. 냉장/냉동 품목은 필수
    }
  ],
  "note": "전량 정상 입고"
}
Response: Delivery (완료 상태)

설명:
- 기존 scan→confirm 2단계 대신, 수량+유통기한만으로 1단계 완료
- 내부적으로 InventoryService.recordStockChange(type=RECEIVE) 호출
- delivery.status = COMPLETED로 변경
- order_plan이 연결되어 있으면 order_plan.status = RECEIVED로 변경
- 기존 /api/v1/receiving/deliveries/{id}/confirm 은 그대로 유지

권한: STORE_MANAGER, KR_INVENTORY
```

```
POST /api/v1/receiving/deliveries/from-order/{orderPlanId}
설명:
- 발주 기반 빠른 입고 Delivery 생성
- order_plan의 order_lines를 읽어 Delivery + DeliveryLine 자동 생성
- 이미 존재하는 delivery가 있으면 그것을 반환
- 기존 /api/v1/receiving/pending 이 없으면 함께 추가

GET /api/v1/receiving/pending?storeId={id}
설명:
- status = DISPATCHED 또는 RECEIVED 상태의 order_plans 중
  아직 delivery가 완료되지 않은 것들 목록
- 매장 입고 대기 목록 화면에서 사용
```

---

## BACKEND 공통 규칙

1. 모든 신규 API는 기존 `ApiResponse<T>` 래퍼 사용
2. 권한 체크는 `@PreAuthorize` 어노테이션 사용 (기존 방식과 동일)
3. 기존 `JwtAuthenticationFilter`, `SecurityConfig` 변경 금지
4. 각 Task 완료 후 `mvn compile` → `mvn test` 실행하여 기존 53개 테스트 통과 확인
5. 에러 발생 시 ARCHITECT에게 보고 후 수정 방향 결정

---

---

# ■ FRONTEND 지시사항

> **작업 원칙**: 기존 페이지를 교체하지 않는다. 기존 라우트는 그대로 유지하고, 새 탭/섹션/버튼을 추가하는 방식으로 구현한다.

---

## PHASE P1-A: Item 마스터 — 운영 필드 편집 UI 추가

### 대상 페이지
`/admin/items` 또는 `/admin/brand-items` 에 있는 상품 상세/편집 모달 또는 페이지

### 구현 방식
기존 상품 편집 폼에 새 탭 "운영 설정" 을 추가한다. 기존 탭("기본 정보", "포장 단위" 등)은 유지.

### "운영 설정" 탭 구성

```tsx
// 탭 내용: 아래 필드들을 shadcn/ui Form + Input/Select 컴포넌트로 구성

{/* 재고관리 등급 */}
<Select name="itemGrade" label="관리 등급">
  <Option value="A">A등급 — 매일 관리 (원두, 우유, 핵심 컵류)</Option>
  <Option value="B">B등급 — 주 2회 관리 (파우더, 시럽, 퓨레)</Option>
  <Option value="C">C등급 — 주 1회 관리 (냅킨, 봉투, 장갑류)</Option>
</Select>

{/* 보관구역 */}
<Select name="storageZone" label="보관구역">
  <Option value="REFRIGERATED">냉장 / 冷蔵</Option>
  <Option value="FROZEN">냉동 / 冷凍</Option>
  <Option value="AMBIENT">상온 / 常温</Option>
  <Option value="SUPPLIES">소모품창고 / 消耗品</Option>
</Select>

{/* 실사 주기 */}
<Select name="countCycle" label="실사 주기">
  <Option value="DAILY">매일</Option>
  <Option value="TWICE_WEEKLY">주 2회</Option>
  <Option value="WEEKLY">주 1회</Option>
  <Option value="MONTHLY">월 1회</Option>
</Select>

{/* 단위 설정 — 3열 그리드 */}
<div className="grid grid-cols-3 gap-3">
  <Input name="stockUnit" label="재고단위" placeholder="g / ml / ea" />
  <Input name="orderUnit" label="발주단위" placeholder="bag / box / pack" />
  <Input name="conversionQty" label="변환수량" type="number"
         hint="1 발주단위 = ? 재고단위. 예: 우유 1pack=1000ml → 1000" />
</div>

{/* 발주 설정 */}
<div className="grid grid-cols-2 gap-3">
  <Input name="minOrderQty" label="최소발주수량" type="number"
         hint="발주단위 기준. 예: 2박스 미만 발주불가 → 2" />
  <Input name="parLevel" label="목표재고량" type="number"
         hint="재고단위 기준. 예: 원두 목표 8,000g → 8000" />
</div>

{/* 로트 추적 */}
<Select name="lotTracking" label="유통기한 추적">
  <Option value="NONE">추적 안함 (컵, 빨대 등 소모품)</Option>
  <Option value="EXP_ONLY">유통기한만 추적 (파우더, 시럽 등)</Option>
  <Option value="FULL">로트 + 유통기한 전체 추적 (우유, 냉동 등)</Option>
</Select>

{/* POS 연동 */}
<Switch name="isPosTracked" label="POS 자동차감 대상"
        description="활성화 시 POS 판매 기록에서 자동으로 재고가 차감됩니다." />
```

### API 연동

```typescript
// frontend/src/api/master.ts 에 추가

interface ItemOperationalRequest {
  stockUnit?: string;
  orderUnit?: string;
  conversionQty?: number;
  minOrderQty?: number;
  parLevel?: number;
  countCycle?: 'DAILY' | 'TWICE_WEEKLY' | 'WEEKLY' | 'MONTHLY';
  storageZone?: 'REFRIGERATED' | 'FROZEN' | 'AMBIENT' | 'SUPPLIES';
  itemGrade?: 'A' | 'B' | 'C';
  substituteItemId?: number | null;
  lotTracking?: 'FULL' | 'EXP_ONLY' | 'NONE';
  isPosTracked?: boolean;
}

export const updateItemOperational = (
  itemId: number,
  data: ItemOperationalRequest
) => api.patch(`/master/items/${itemId}/operational`, data);
```

---

## PHASE P1-B: 발주 추천 화면 — 근거 표시 강화

### 대상 페이지
`/store/ordering/new` → Step 2 카탈로그 화면의 각 품목 카드

### 현재 상태 파악 후 구현
기존 NewOrderPage.tsx를 먼저 읽고, 카탈로그 품목 카드 컴포넌트를 찾는다.

### 품목 카드에 추가할 정보

```tsx
// 각 품목 카드 하단에 추가 (현재 재고 표시 아래)
{item.itemGrade && (
  <div className="mt-2 space-y-1">
    {/* 재고 상태 게이지 */}
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>현재</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            item.isLowStock ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${Math.min((item.currentStock / (item.parLevel || 1)) * 100, 100)}%` }}
        />
      </div>
      <span>{item.currentStock}{item.stockUnit} / 목표 {item.parLevel}{item.stockUnit}</span>
    </div>

    {/* 추천 근거 */}
    {item.daysUntilEmpty !== undefined && (
      <p className="text-xs text-muted-foreground">
        {item.daysUntilEmpty < 1
          ? "⚠️ 오늘 소진 예상"
          : `약 ${item.daysUntilEmpty.toFixed(1)}일 후 소진 예상`}
        {item.dailyUsageAvg > 0 && ` (일 ${item.dailyUsageAvg}${item.stockUnit} 사용)`}
      </p>
    )}

    {/* 추천 수량 근거 */}
    {item.suggestedQty > 0 && (
      <p className="text-xs font-medium text-primary">
        → {item.suggestedQty}{item.orderUnit} 추천
        {item.recommendationBasis && (
          <span className="text-muted-foreground font-normal"> ({item.recommendationBasis})</span>
        )}
      </p>
    )}
  </div>
)}
```

### 상단 긴급/권장 섹션 추가

카탈로그 상단에 `needs` API 결과를 기반으로 섹션 추가:

```tsx
// Step 2 상단에 추가 (카테고리 탭 위)
{needsData && (needsData.urgent.length > 0 || needsData.recommended.length > 0) && (
  <div className="mb-4 space-y-3">
    {needsData.urgent.length > 0 && (
      <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
        <p className="text-sm font-semibold text-destructive mb-2">
          🚨 긴급 발주 필요 ({needsData.urgent.length}개)
        </p>
        <div className="flex flex-wrap gap-2">
          {needsData.urgent.map(item => (
            <Badge
              key={item.itemId}
              variant="destructive"
              className="cursor-pointer"
              onClick={() => addToCart(item.itemId, item.suggestedQty)}
            >
              {item.itemName} +{item.suggestedQty}{item.orderUnit}
            </Badge>
          ))}
        </div>
      </div>
    )}
    {/* recommended 섹션도 동일 패턴 */}
  </div>
)}
```

---

## PHASE P1-C: 빠른 입고 화면 추가

### 대상 페이지
`/store/receiving` — 기존 바코드 스캔 탭 옆에 "발주 기반 입고" 탭 추가

### 탭 구조

```tsx
// 기존 ReceivingPage.tsx에 탭 추가
// 기존 바코드 스캔 탭은 그대로 유지

<Tabs defaultValue="order-based">
  <TabsList>
    <TabsTrigger value="order-based">발주 기반 입고</TabsTrigger>
    <TabsTrigger value="barcode">바코드 스캔</TabsTrigger>  {/* 기존 탭 */}
    <TabsTrigger value="manual">수기 입고</TabsTrigger>    {/* 기존 탭 */}
  </TabsList>

  {/* 발주 기반 입고 탭 */}
  <TabsContent value="order-based">
    <OrderBasedReceiving storeId={storeId} />
  </TabsContent>
</Tabs>
```

### `OrderBasedReceiving` 컴포넌트

```tsx
// frontend/src/components/store/OrderBasedReceiving.tsx (신규 파일)

// 1. GET /api/v1/receiving/pending?storeId={id} 로 입고 대기 발주 목록 조회
// 2. 각 발주서를 카드로 표시: 발주일, 공급사명, 품목 수, 예상 납품일
// 3. "입고 처리" 버튼 클릭 시 입고 상세 화면으로 전환

// 입고 상세 화면:
// - 발주 품목 목록 (발주수량 표시)
// - 각 품목의 "실제 입고수량" 입력 (기본값: 발주수량)
// - lot_tracking = EXP_ONLY 또는 FULL 인 품목은 유통기한 입력 필드 표시
//   (lot_tracking = NONE 인 품목은 유통기한 입력 생략)
// - "전량 정상 입고" 버튼 (기본값으로 즉시 완료)
// - "일부 차이 있음" 버튼 (수량 수정 후 확인)
// - 하단 "입고 확정" 버튼 → POST /api/v1/receiving/deliveries/{id}/quick-confirm
```

---

## PHASE P1-D: Cycle Count 화면 추가

### 대상 위치
기존 `/store/inventory` 페이지 또는 `/store/physical-count` 페이지에 탭 추가

### 라우트 추가
`App.tsx`에 추가:
```tsx
<Route path="/store/cycle-count" element={<CycleCountPage />} />
<Route path="/store/cycle-count/:sessionId" element={<CycleCountDetailPage />} />
```

### `CycleCountPage.tsx` (신규 파일)

```tsx
// /store/cycle-count

// 1. 활성 세션이 있으면 상단에 배너로 표시 ("진행 중인 실사 있음 → 계속하기")

// 2. "새 실사 시작" 섹션:
//    등급 선택: [A등급만] [B등급만] [C등급만] [전체]
//    구역 선택: [냉장] [냉동] [상온] [소모품] [전체]
//    → "실사 시작" 버튼 → POST /api/v1/cycle-count/sessions

// 3. 최근 실사 이력 목록 (최근 5건):
//    날짜, 등급/구역 필터, 품목 수, 오차 건수, 상태

// 실사 시작 가이드 텍스트:
// A등급 선택 시: "약 5분 소요 • 매일 오픈 전 권장 • 원두/우유/컵류 포함"
// B등급 선택 시: "약 15분 소요 • 주 2회 권장 • 파우더/시럽/퓨레 포함"
```

### `CycleCountDetailPage.tsx` (신규 파일)

```tsx
// /store/cycle-count/:sessionId

// 1. 세션 정보 헤더: 등급, 구역, 진행률 (3/15 완료)

// 2. 품목 목록 (보관구역별 그룹)
//    각 품목 행:
//    - 품목명 (KO/JA 전환)
//    - 시스템 재고: 2.5 kg
//    - 실측 입력: [숫자 키패드 중심 Input] kg
//    - 차이: +0.5 / -0.3 (입력 즉시 표시)
//    - 차이가 있으면 행을 노란색으로 하이라이트

// 3. 숫자 키패드: 모바일 환경을 위해 type="number" inputMode="decimal"

// 4. 하단 "실사 완료" 버튼:
//    → 미입력 항목이 있으면 경고 ("3개 품목 미입력 - 그래도 완료할까요?")
//    → 차이가 있는 품목에 대해 "재고 조정 적용 여부" 확인 다이얼로그
//    → POST /api/v1/cycle-count/sessions/{id}/complete
```

---

## PHASE P1-E: 매장 대시보드 "오늘 할 일" 개편

### 대상 페이지
`/store/dashboard` — `DashboardPage.tsx`

### 구현 방식
기존 대시보드의 KPI 카드 구성을 유지하되, 최상단에 "오늘 할 일" 섹션을 추가한다.

### "오늘 할 일" 섹션 구성

```tsx
// 기존 대시보드 최상단에 추가 (기존 KPI 카드 위)

// 오늘 날짜 + 인사말
<div className="mb-4">
  <h2 className="text-lg font-semibold">오늘 할 일</h2>
  <p className="text-sm text-muted-foreground">{today} 기준</p>
</div>

// 액션 카드 그리드 (2열)
<div className="grid grid-cols-2 gap-3 mb-6">

  {/* 긴급 발주 카드 */}
  {urgentCount > 0 && (
    <ActionCard
      icon="🚨"
      title="긴급 발주"
      value={`${urgentCount}개 품목`}
      description="안전재고 이하"
      variant="destructive"
      onClick={() => navigate('/store/ordering/new')}
    />
  )}

  {/* 입고 대기 카드 */}
  {pendingReceiveCount > 0 && (
    <ActionCard
      icon="📦"
      title="입고 대기"
      value={`${pendingReceiveCount}건`}
      description="오늘 납품 예정"
      variant="warning"
      onClick={() => navigate('/store/receiving')}
    />
  )}

  {/* 유통기한 임박 카드 */}
  {expiryCount > 0 && (
    <ActionCard
      icon="⏰"
      title="유통기한 임박"
      value={`${expiryCount}개`}
      description="3일 이내 만료"
      variant="warning"
      onClick={() => navigate('/store/expiry')}
    />
  )}

  {/* A등급 실사 카드 (오늘 아직 안 한 경우) */}
  {!todayCycleCountDone && (
    <ActionCard
      icon="📋"
      title="오늘 실사 미완"
      value="A등급 핵심 품목"
      description="5분 실사 시작"
      variant="default"
      onClick={() => navigate('/store/cycle-count')}
    />
  )}

</div>

{/* 기존 KPI 카드들은 그 아래에 유지 */}
```

### `ActionCard` 컴포넌트 생성

```tsx
// frontend/src/components/store/ActionCard.tsx (신규 파일)
// shadcn/ui Card + Button 조합으로 구현
// variant: 'default' | 'warning' | 'destructive'
// 클릭 시 onClick 실행
```

---

## PHASE P1-F: 폐기 등록 간편화

### 대상 페이지
`/store/waste` — `WastePage.tsx`

### 변경 방식
기존 폐기 등록 폼의 사유 목록을 5개로 단순화한다.
기존 enum 값은 유지하되, UI 표시 레이블만 변경.

```tsx
// 폐기 사유 선택을 라디오/칩 형태로 변경
const WASTE_REASONS = [
  { value: 'EXPIRY',         label: '유통기한', icon: '📅' },
  { value: 'DAMAGE',         label: '파손/변질', icon: '💥' },
  { value: 'COOKING_ERROR',  label: '제조실수', icon: '☕' },
  { value: 'QUALITY',        label: '품질문제', icon: '❌' },
  { value: 'OTHER',          label: '기타',     icon: '📝' },
];

// 칩 형태 UI:
<div className="flex flex-wrap gap-2">
  {WASTE_REASONS.map(reason => (
    <button
      key={reason.value}
      className={cn(
        "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
        selected === reason.value
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-input hover:bg-muted"
      )}
      onClick={() => setSelected(reason.value)}
    >
      {reason.icon} {reason.label}
    </button>
  ))}
</div>

// 품목 선택: 자주 폐기하는 A등급/B등급 품목을 상단에 표시
// (item_grade = 'A' 품목 먼저, 그 다음 B등급)
```

---

## FRONTEND 공통 규칙

1. **기존 파일 수정 시**: 수정 전에 반드시 파일 전체를 읽고 기존 구조를 파악한다.
2. **기존 라우트 유지**: 기존 경로는 절대 변경하지 않는다.
3. **i18n**: 새 텍스트는 `translation.json`에 키를 추가하고 `useTranslation()` 사용. 하드코딩 금지.
4. **API 호출**: 기존 `src/api/client.ts`의 axios 인스턴스 사용. 새 API는 해당 모듈 파일에 추가.
5. **shadcn/ui**: 이미 설치된 컴포넌트만 사용. 새 컴포넌트 설치 필요 시 ARCHITECT에게 보고.
6. **TypeScript**: 모든 신규 파일은 TypeScript. `any` 타입 사용 금지.
7. **모바일 우선**: 매장 화면은 모바일 428px 기준 설계. `flex flex-col`, `w-full`, `text-base` 기준.
8. **빌드 확인**: 각 Phase 완료 후 `npm run build` 성공 확인.

---

---

# PHASE P2: 안정화 후 작업 (운영 1주 후 진행)

P0/P1 완료 후 매장에서 실제로 1주일 운영해본 뒤 진행한다.
에이전트 팀이 자동으로 진행하지 말고, 사람이 검토 후 별도 지시한다.

## P2-A: par_level/min_stock_qty 일괄 조정 UI
- 관리자 화면에서 여러 품목을 한 번에 par_level/safety_stock 수정
- CSV 다운로드 → 수정 → 업로드 방식

## P2-B: 일평균 소비량 기반 자동 par_level 제안
- 현재 daily_usage_avg × leadTimeDays × 1.5 공식으로 권장 par_level 계산
- 관리자 화면에서 "제안값 일괄 적용" 기능

## P2-C: POS 자동차감 오차율 대시보드
- is_pos_tracked = true인 품목에서 POS 차감 재고 vs 실사 재고 비교
- 오차율 큰 품목 하이라이트 → 레시피 점검 트리거

## P2-D: 발주서 이메일 전송 완성
- 기존 `OrderDispatchLog`, `SES` 설정 기반으로 실제 이메일 발송
- 공급사 이메일로 PDF 첨부 발송

---

---

# 검증 체크리스트

## ARCHITECT가 각 Phase 완료 시 확인할 항목

### PHASE P0 완료 기준

```
□ Flyway 마이그레이션 적용 확인
  → SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
  → 신규 마이그레이션이 'success' 상태인지 확인

□ items 테이블 컬럼 추가 확인
  → DESC items;
  → stock_unit, order_unit, conversion_qty, min_order_qty, par_level,
     count_cycle, storage_zone, item_grade, lot_tracking,
     daily_usage_avg, is_pos_tracked 컬럼 존재 확인

□ cycle_count_session, cycle_count_line 테이블 생성 확인
  → SHOW TABLES LIKE '%cycle%';

□ 아오야마 72개 품목 등록 확인
  → SELECT count(*) FROM items WHERE brand_id = {id} AND is_active = true;
  → SELECT name_ko, item_grade, storage_zone, stock_unit, order_unit
     FROM items WHERE brand_id = {id} ORDER BY item_grade, storage_zone;

□ 기존 테스트 통과 확인
  → cd backend && mvn test
  → 53개 테스트 모두 통과

□ 빌드 성공 확인
  → mvn clean package -DskipTests
```

### PHASE P1 완료 기준

```
□ 프론트엔드 빌드 성공
  → cd frontend && npm run build

□ 신규 API 수동 테스트 (curl 또는 브라우저 DevTools)
  □ PATCH /api/v1/master/items/{id}/operational — 200 응답
  □ POST /api/v1/cycle-count/sessions — 세션 생성 성공
  □ GET /api/v1/receiving/pending?storeId={id} — 빈 배열 또는 목록 반환
  □ GET /api/v1/ordering/needs?storeId={id} — recommendationBasis 필드 포함 확인

□ 기존 API 정상 동작 확인 (regression)
  □ GET /api/v1/master/items?brandId={id} — 기존 필드 + 신규 필드 함께 반환
  □ GET /api/v1/inventory/snapshot?storeId={id} — 기존과 동일
  □ GET /api/v1/ordering/catalog?storeId={id}&deliveryDate={date} — 기존과 동일
  □ POST /api/v1/waste — 기존과 동일
  □ POST /api/v1/physical-count/start — 기존과 동일

□ 화면 동작 확인 (브라우저)
  □ /admin/items 상품 편집 → "운영 설정" 탭 표시됨
  □ /store/ordering/new Step 2 → 추천 근거 텍스트 표시됨
  □ /store/receiving → "발주 기반 입고" 탭 표시됨
  □ /store/cycle-count → 페이지 정상 로딩
  □ /store/dashboard → "오늘 할 일" 섹션 표시됨
```

### 운영 투입 전 최종 점검

```
□ 아오야마 매장 storeId 확인 및 테스트 계정 로그인 확인
□ STORE_MANAGER 역할로 로그인하여 발주 전체 흐름 테스트
  → 대시보드 → 발주 추천 확인 → 장바구니 추가 → 발주 확정
□ 입고 대기 발주 하나 생성 후 → /store/receiving → 빠른 입고 처리 테스트
□ /store/cycle-count → A등급 세션 시작 → 수량 입력 → 완료 처리
□ /store/waste → 폐기 5개 사유 중 하나 선택 → 등록
□ 모바일 화면 (Chrome DevTools 428px) 에서 주요 화면 체크
□ 로그인 화면 → 토큰 만료 → 자동 갱신 정상 동작 확인
```

---

## 긴급 롤백 절차

P0 마이그레이션 적용 후 문제 발생 시:

```sql
-- ADD COLUMN은 DROP COLUMN으로 롤백 가능 (데이터 없을 때만)
-- 단, 마이그레이션 파일 삭제 후 flyway_schema_history에서 해당 버전 레코드도 삭제 필요

-- 1. 신규 컬럼이 문제인 경우
ALTER TABLE items
  DROP COLUMN IF EXISTS stock_unit,
  DROP COLUMN IF EXISTS order_unit,
  -- ... 나머지 신규 컬럼
;

-- 2. 신규 테이블이 문제인 경우
DROP TABLE IF EXISTS cycle_count_line;
DROP TABLE IF EXISTS cycle_count_session;

-- 3. flyway 히스토리에서 해당 버전 삭제
DELETE FROM flyway_schema_history WHERE version IN ('35', '36');

-- 4. 백엔드 재배포 (이전 버전 코드로)
```

**주의**: 롤백은 반드시 사람이 판단 후 실행. 에이전트가 자동으로 롤백하지 않는다.

---

끝.

