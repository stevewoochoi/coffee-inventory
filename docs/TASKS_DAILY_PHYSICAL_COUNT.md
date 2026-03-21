# TASKS_DAILY_PHYSICAL_COUNT.md — 일별 재고실사 페이지 (매장용)

> **목적**: 매장 직원이 매일 재고를 실사(직접 카운트)하고,
> 엑셀 `AOYAMA_INVENTORY.xlsx`처럼 월간 그리드로 한눈에 볼 수 있는 태블릿 전용 페이지 구현
> **대상 역할**: STORE_MANAGER (매장 태블릿 화면 `/store`)
> **참고 파일**: `AOYAMA_INVENTORY.xlsx` — 시트: `2026 APRIL`
> **Agent 팀**: Backend Agent + Frontend Agent 병렬 실행

-----

## 엑셀 파일 구조 → 시스템 요구사항

```
엑셀 구조:
  행: 72개 품목 (한국어명 col0 + 일본어명 col1)
  열: 날짜 (전월 말일 2일 + 당월 1~31일) = 최대 33개 열
  셀: 해당 날짜에 실사한 재고 수량 (현재 미입력 상태)

→ 시스템 UI:
  - 품목 행, 날짜 열 그리드
  - 오늘 날짜 열 강조
  - 셀 탭/클릭 → 수량 입력
  - 월 단위 이동 (이전달 / 다음달)
  - 한국어 + 일본어 품목명 동시 표시
```

-----

## 품목 목록 (72개, 엑셀 기준)

아래 품목이 시스템 `item` 테이블에 이미 등록되어 있다고 가정.
일본어명(`name_ja`)은 이번 작업에서 `item` 테이블에 컬럼 추가하여 저장.

|한국어명        |일본어명            |
|------------|----------------|
|우유          |牛乳              |
|생크림         |生クリーム           |
|탄산수         |炭酸水             |
|오렌지주스       |オレンジジュース        |
|레몬즙         |レモン汁            |
|연유          |練乳              |
|레몬          |レモン             |
|냉동딸기        |冷凍イチゴ           |
|냉동딸기 다이스    |冷凍イチゴダイス        |
|믹스베리 다이스    |ミックスベリーダイス      |
|와플냉동생지      |ワッフル冷凍生地        |
|다크원두        |ダーク豆            |
|프루티원두       |フルーティー豆         |
|설탕          |グラニュー糖          |
|소금          |塩               |
|가당말차라떼파우더   |抹茶ラテパウダー        |
|무당말차파우더     |無糖抹茶パウダー        |
|코코아 파우더     |ココアパウダー         |
|무당코코아파우더    |無糖ココアパウダー       |
|블랙코코아파우더    |ブラックココアパウダー     |
|요거트파우더      |ヨーグルトパウダー       |
|율무차파우더      |ユルムパウダー         |
|얼그레이        |アールグレイ          |
|잉글리쉬블랙퍼스트   |イングリッシュブラックファースト|
|얼그레이티백      |アールグレイティーバッグ    |
|다즐링티백       |ダージリンティーバッグ     |
|히비스커스티백     |ハイビスカスティーバッグ    |
|캐모마일티백      |カモミールティーバッグ     |
|초코소스        |チョコソース          |
|카라멜소스       |キャラメルソース        |
|캬라멜시럽       |キャラメルシロップ       |
|바닐라시럽       |バニラシロップ         |
|마카다미아시럽     |マカダミアシロップ       |
|헤이즐넛시럽      |ヘーゼルナッツシロップ     |
|로즈시럽        |ローズシロップ         |
|블루베리퓨레      |ブルーベリーピューレ      |
|딸기퓨레        |イチゴピューレ         |
|리치퓨레        |ライチピューレ         |
|오렌지퓨레       |オレンジピューレ        |
|라즈베리퓨레      |ラズベリーピューレ       |
|사과베이스       |アップルベース         |
|배베이스        |梨ベース            |
|유자청         |ユズジャム           |
|자몽청         |グレープフルーツジャム     |
|나타드코코       |ナタデココ           |
|검시럽포션       |ガムシロップポーション     |
|프림포션        |グリムポーション        |
|핫컵 12온즈     |ホットカップ 12オンス    |
|핫컵 16온즈     |ホットカップ 16オンス    |
|핫컵 뚜껑       |ホットカップの蓋        |
|아이스컵 14온즈   |アイスカップ 14オンス    |
|아이스컵 14온즈 뚜껑|アイスカップ 14オンス 蓋  |
|아이스컵 22온즈   |アイスカップ 22オンス    |
|아이스컵 22온즈 뚜껑|アイスカップ 22オンス 蓋  |
|컵홀더         |カップホルダー         |
|캐리어         |キャリア            |
|빨대          |ストロー            |
|두꺼운 빨대      |太いストロー          |
|포크          |フォーク            |
|나이프         |ナイフ             |
|핫용 머들러      |マドラー            |
|물티슈         |ウェットティッシュ       |
|냅킨          |ナプキン            |
|로고스티커       |ロゴシール           |
|와플 봉투       |ワッフル袋           |
|손잡이봉투 (소)   |手提げ袋（小）         |
|손잡이봉투 (중)   |手提げ袋（中）         |
|쓰레기봉투       |ゴミ袋             |
|니트릴장갑 S     |ニトリル手袋 S        |
|니트릴장갑 M     |ニトリル手袋 M        |
|니트릴장갑 L     |ニトリル手袋 L        |
|차백          |茶バック            |

-----

## PHASE 1: DB 스키마

### TASK-BK-01 | Flyway 마이그레이션

**파일명**: 현재 최신 버전 다음 번호로 생성

```sql
-- 1) item 테이블에 일본어명 컬럼 추가
ALTER TABLE item
  ADD COLUMN name_ja VARCHAR(200) DEFAULT NULL COMMENT '일본어 품목명';

-- 2) 일별 재고실사 테이블
CREATE TABLE physical_count (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id    BIGINT NOT NULL,
  item_id     BIGINT NOT NULL,
  count_date  DATE   NOT NULL,           -- 실사 날짜
  qty         DECIMAL(12,3) NOT NULL,    -- 실사 수량
  memo        VARCHAR(200) DEFAULT NULL, -- 메모 (선택)
  created_by  BIGINT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_item_date (store_id, item_id, count_date),
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (item_id)  REFERENCES item(id)
);
```

-----

## PHASE 2: Backend 구현

### TASK-BK-02 | PhysicalCount 엔티티 및 Repository

**경로**: `backend/src/main/java/com/coffee/domain/inventory/`

#### `PhysicalCount.java` (Entity)

```java
@Entity
@Table(name = "physical_count")
public class PhysicalCount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "count_date", nullable = false)
    private LocalDate countDate;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal qty;

    @Column(length = 200)
    private String memo;

    @Column(name = "created_by")
    private Long createdBy;
}
```

#### `PhysicalCountRepository.java`

```java
public interface PhysicalCountRepository extends JpaRepository<PhysicalCount, Long> {

    // 특정 매장의 특정 월 전체 실사 데이터 조회
    @Query("SELECT p FROM PhysicalCount p WHERE p.storeId = :storeId " +
           "AND YEAR(p.countDate) = :year AND MONTH(p.countDate) = :month")
    List<PhysicalCount> findByStoreIdAndYearMonth(
        @Param("storeId") Long storeId,
        @Param("year") int year,
        @Param("month") int month
    );

    // 특정 날짜의 단일 실사 조회 (upsert용)
    Optional<PhysicalCount> findByStoreIdAndItemIdAndCountDate(
        Long storeId, Long itemId, LocalDate countDate
    );
}
```

-----

### TASK-BK-03 | DTO 작성

**경로**: `backend/src/main/java/com/coffee/domain/inventory/dto/`

#### `PhysicalCountMonthResponse.java`

```java
// GET 응답: 월간 전체 실사 데이터
public class PhysicalCountMonthResponse {
    private int year;
    private int month;
    private List<ItemCountRow> rows;

    public static class ItemCountRow {
        private Long itemId;
        private String itemName;        // 한국어명
        private String itemNameJa;      // 일본어명
        private Map<Integer, BigDecimal> dailyCounts; // key=일(1~31), value=수량
    }
}
```

#### `PhysicalCountSaveRequest.java`

```java
// PUT 요청: 단일 셀 저장
public class PhysicalCountSaveRequest {
    private Long storeId;
    private Long itemId;
    private LocalDate countDate;
    private BigDecimal qty;
    private String memo;
}
```

#### `PhysicalCountSaveResponse.java`

```java
public class PhysicalCountSaveResponse {
    private Long id;
    private Long itemId;
    private LocalDate countDate;
    private BigDecimal qty;
    private String updatedAt;
}
```

-----

### TASK-BK-04 | PhysicalCountService 작성

**경로**: `backend/src/main/java/com/coffee/domain/inventory/service/PhysicalCountService.java`

```
getMonthlyCount(storeId, year, month):
  1. PhysicalCountRepository.findByStoreIdAndYearMonth() 조회
  2. 해당 storeId의 brand_id 조회 → 그 브랜드 item 전체 목록 조회
     (ItemRepository.findAllByBrandId(brandId), name_ja 포함)
  3. item별로 dailyCounts Map<Integer, BigDecimal> 구성
     (없는 날짜는 Map에 포함하지 않음 → 프론트에서 "-" 표시)
  4. PhysicalCountMonthResponse 반환

saveCount(request, userId):
  1. findByStoreIdAndItemIdAndCountDate() 조회
  2. 있으면 UPDATE (qty, memo, updated_at)
  3. 없으면 INSERT (새 PhysicalCount 생성)
  4. PhysicalCountSaveResponse 반환
```

-----

### TASK-BK-05 | PhysicalCountController 작성

**경로**: `backend/src/main/java/com/coffee/domain/inventory/controller/PhysicalCountController.java`

```java
@RestController
@RequestMapping("/api/v1/physical-counts")
@RequiredArgsConstructor
public class PhysicalCountController {

    private final PhysicalCountService physicalCountService;

    /**
     * GET /api/v1/physical-counts/monthly
     * 월간 실사 데이터 조회
     * Params: storeId, year, month
     * 권한: STORE_MANAGER (자기 매장만), BRAND_ADMIN
     */
    @GetMapping("/monthly")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'BRAND_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PhysicalCountMonthResponse> getMonthly(
            @RequestParam Long storeId,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(
            physicalCountService.getMonthlyCount(storeId, year, month)
        );
    }

    /**
     * PUT /api/v1/physical-counts
     * 단일 셀 실사 저장 (upsert)
     * 권한: STORE_MANAGER (자기 매장만)
     */
    @PutMapping
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'BRAND_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PhysicalCountSaveResponse> save(
            @RequestBody PhysicalCountSaveRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(
            physicalCountService.saveCount(request, userId)
        );
    }
}
```

-----

### TASK-BK-06 | Item 엔티티 `name_ja` 필드 추가

`Item.java` 엔티티에 추가:

```java
@Column(name = "name_ja", length = 200)
private String nameJa;
```

`ItemRepository.java`에 추가:

```java
List<Item> findAllByBrandId(Long brandId);
```

-----

## PHASE 3: Frontend 구현

### TASK-FE-01 | API 클라이언트 함수 추가

**경로**: `frontend/src/api/physicalCount.js` (신규 파일)

```javascript
import apiClient from './client'

export const getMonthlyCount = async (storeId, year, month) => {
  const res = await apiClient.get('/physical-counts/monthly', {
    params: { storeId, year, month }
  })
  return res.data
}

export const saveCount = async ({ storeId, itemId, countDate, qty, memo }) => {
  const res = await apiClient.put('/physical-counts', {
    storeId, itemId, countDate, qty, memo
  })
  return res.data
}
```

-----

### TASK-FE-02 | DailyInventoryPage 컴포넌트 작성

**경로**: `frontend/src/pages/store/DailyInventoryPage.jsx` (신규 파일)

-----

### TASK-FE-03 | 라우팅 등록

기존 store 라우팅 파일에 추가:

```jsx
<Route path="/store/inventory/daily" element={<DailyInventoryPage />} />
```

-----

### TASK-FE-04 | 매장 네비게이션 메뉴에 항목 추가

기존 매장 사이드바 또는 하단 탭 네비게이션에 아래 항목 추가:

```jsx
{
  path: '/store/inventory/daily',
  icon: <ClipboardList size={20} />,
  label: '재고실사',
  labelJa: '在庫実査'
}
```

-----

## PHASE 4: 데이터 초기화 (선택)

### TASK-BK-07 | 아오야마점 품목 일본어명 DATA SQL 작성

-----

## 주의사항

1. **테이블 고정 + 가로 스크롤**: 품목 열은 `position: sticky` 또는 별도 div로 고정
2. **태블릿 터치 최적화**: 셀 높이 최소 `h-12 (48px)`, 입력 모달은 하단 슬라이드업 방식
3. **낙관적 업데이트**: PUT 응답 전에 로컬 상태 먼저 업데이트
4. **전월 말일 2열**: 엑셀 원본과 동일하게 표시하되 편집 불가(회색 처리)
5. **소수점 입력**: `qty DECIMAL(12,3)` — 리터 단위로 소수점 입력 가능
6. **STORE_MANAGER 권한 격리**: Controller에서 JWT의 `storeId`와 요청의 `storeId` 일치 검증
