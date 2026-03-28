# 일별재고실사 ↔ 재고현황 연동 구현 명세

> **작성일**: 2026-03-28
> **목적**: 일별재고실사(Daily Physical Count)와 재고현황(Inventory Snapshot)을 연동하여, 실사 입력 시 자동으로 재고를 조정하고 차이를 추적한다.

---

## 1. 변경 전 상태 (문제점)

### 완전 단절 상태
- `DailyPhysicalCountService.saveCount()`는 단순히 `daily_physical_count` 테이블에 기록만 저장
- `InventoryService`, `InventorySnapshot`, `StockLedger`와 **어떤 연동도 없었음**
- 매장 직원이 실사를 해도 시스템 재고에 전혀 반영되지 않음
- 시스템 재고와 실사값의 차이를 확인할 수 없음

### 영향
- 재고 정확도 검증 불가
- 수동으로 `/store/inventory` 페이지에서 개별 조정 필요
- 실사의 실질적 의미가 없는 상태

---

## 2. 변경 사항

### 2.1 DB 마이그레이션 (V37)

**파일**: `backend/src/main/resources/db/migration/V37__daily_count_inventory_link.sql`

```sql
ALTER TABLE daily_physical_count
  ADD COLUMN system_qty DECIMAL(12,3) NULL,      -- 실사 시점 시스템 재고
  ADD COLUMN variance_qty DECIMAL(12,3) NULL,    -- 차이 (실사값 - 시스템)
  ADD COLUMN is_applied BOOLEAN DEFAULT FALSE,   -- 재고 조정 적용 여부
  ADD COLUMN applied_at DATETIME NULL;           -- 조정 적용 시간
```

### 2.2 백엔드 변경

#### Entity: `DailyPhysicalCount.java`
- `systemQty`, `varianceQty`, `isApplied`, `appliedAt` 필드 추가

#### DTO: `DailyPhysicalCountDto.java`

**ItemCountRow (월간 조회 응답)** — 추가 필드:
| 필드 | 타입 | 설명 |
|------|------|------|
| `baseUnit` | String | 기본 단위 (g, ml, ea 등) |
| `stockUnit` | String | 재고 단위 (운영 설정) |
| `currentSystemQty` | BigDecimal | 현재 시스템 재고 (실시간) |
| `systemQties` | Map<Integer, BigDecimal> | 일별 실사 시점 시스템 재고 |
| `varianceQties` | Map<Integer, BigDecimal> | 일별 차이 (실사 - 시스템) |
| `appliedFlags` | Map<Integer, Boolean> | 일별 조정 적용 여부 |

**SaveResponse** — 추가 필드:
| 필드 | 타입 | 설명 |
|------|------|------|
| `systemQty` | BigDecimal | 실사 시점 시스템 재고 |
| `varianceQty` | BigDecimal | 차이 (실사 - 시스템) |
| `isApplied` | Boolean | 재고 조정 적용 여부 |

#### Service: `DailyPhysicalCountService.java`

**핵심 로직 변경 — `saveCount()`:**

```
1. 현재 시스템 재고 조회 (InventorySnapshot SUM)
2. 차이 계산: variance = 실사값 - 시스템 재고
3. daily_physical_count 레코드에 systemQty, varianceQty 저장
4. 차이 ≠ 0 이면:
   → InventoryService.recordStockChange() 호출
   → type: ADJUST, refType: "DAILY_COUNT"
   → 재고 자동 조정
5. 재입력 시: 현재 시스템 재고가 이미 이전 조정을 포함하므로
   단순히 새 차이만큼 추가 조정 (이중 계산 방지)
```

**조정 공식:**
```
adjustmentQty = 실사값 - 현재_시스템_재고
// 현재_시스템_재고는 이미 이전 조정을 포함한 값
// 따라서 추가 조정 = 현재 차이 그대로
```

**`getMonthlyCount()` 변경:**
- 각 품목의 현재 시스템 재고(`currentSystemQty`) 포함
- 일별 시스템 재고, 차이, 적용 여부 맵 포함

#### Controller: `DailyPhysicalCountController.java`

**변경**: `PUT /api/v1/daily-counts`
- `storeId`를 쿼리 파라미터로 추가 (optional)
- BRAND_ADMIN/SUPER_ADMIN (storeId=null인 유저) 지원
- 미전달 시 `user.getStoreId()` 사용 (STORE_MANAGER)

### 2.3 프론트엔드 변경

#### API: `dailyCount.ts`
- `ItemCountRow`에 `baseUnit`, `stockUnit`, `currentSystemQty`, `systemQties`, `varianceQties`, `appliedFlags` 추가
- `SaveResponse`에 `systemQty`, `varianceQty`, `isApplied` 추가
- `saveDailyCount()`에 `storeId` 파라미터 추가

#### UI: `DailyInventoryPage.tsx`

1. **품목 고정 열**: 품목명 아래에 현재 시스템 재고 표시
   ```
   다크원두
   재고 500g
   ```

2. **셀 색상**: 차이에 따라 하이라이트
   - 차이 > 0 (초과): 연한 초록 배경 + 초록 글씨
   - 차이 < 0 (부족): 연한 빨강 배경 + 빨강 글씨
   - 차이 없음: 기본 검정 볼드

3. **입력 모달**: 시스템 재고 표시
   ```
   다크원두
   2026년 3월 28일
   시스템 재고: 500 g
   [      800      ]
   [취소] [저장]
   ```

4. **저장 토스트**: 차이 정보 포함
   ```
   저장완료 (차이: +300 → 재고 조정됨)
   ```

---

## 3. 데이터 흐름

```
매장 직원: 실사 입력 (다크원두 = 800g)
   ↓
DailyPhysicalCountController.save()
   ↓
DailyPhysicalCountService.saveCount()
   ├── 1. InventorySnapshot에서 현재 재고 조회 → 500g
   ├── 2. 차이 계산: 800 - 500 = +300g
   ├── 3. DailyPhysicalCount 저장 (systemQty=500, varianceQty=300)
   └── 4. InventoryService.recordStockChange(+300, ADJUST, DAILY_COUNT)
          ├── StockLedger 기록 (+300, ADJUST)
          └── InventorySnapshot 업데이트 (500 → 800)
   ↓
응답: {qty: 800, systemQty: 500, varianceQty: 300, isApplied: true}
   ↓
프론트엔드: 토스트 "저장완료 (차이: +300 → 재고 조정됨)"
            셀 초록색으로 변경
```

---

## 4. 테스트 결과

### API 테스트 (2026-03-28 실행)

| 시나리오 | 시스템 재고 | 실사값 | 차이 | 조정 후 재고 | 결과 |
|---------|-----------|-------|------|------------|------|
| 최초 실사 | 0 | 500 | +500 | 500 | ✅ |
| 재입력 (증가) | 500 | 800 | +300 | 800 | ✅ |
| 재입력 (감소) | 800 | 300 | -500 | 300 | ✅ |

### StockLedger 이력 확인

| ID | qty_base_unit | type | memo |
|----|---------------|------|------|
| 3 | +500.000 | ADJUST | Daily count adjustment: 2026-03-28 |
| 4 | +300.000 | ADJUST | Daily count adjustment: 2026-03-28 |
| 5 | -500.000 | ADJUST | Daily count adjustment: 2026-03-28 |

### 기존 테스트 호환성
- 전체 290개 테스트 실행
- 12개 실패 (모두 기존 날짜 관련 테스트, 변경 전과 동일)
- **신규 코드로 인한 테스트 실패 0건**

---

## 5. 영향받는 파일

### 백엔드
| 파일 | 변경 유형 |
|------|----------|
| `V37__daily_count_inventory_link.sql` | 신규 (마이그레이션) |
| `DailyPhysicalCount.java` | 수정 (필드 추가) |
| `DailyPhysicalCountDto.java` | 수정 (DTO 확장) |
| `DailyPhysicalCountService.java` | 수정 (핵심 로직 변경) |
| `DailyPhysicalCountController.java` | 수정 (storeId 파라미터) |

### 프론트엔드
| 파일 | 변경 유형 |
|------|----------|
| `dailyCount.ts` | 수정 (타입 확장, storeId 지원) |
| `DailyInventoryPage.tsx` | 수정 (시스템 재고 표시, 차이 색상) |

---

## 6. 주의사항

1. **기존 실사 데이터**: V37 이전에 저장된 실사 레코드는 `system_qty`, `variance_qty`가 NULL. UI에서 graceful하게 처리됨.

2. **재입력 로직**: 같은 날 같은 품목을 여러 번 입력하면, 매번 현재 시스템 재고와의 차이만큼 조정됩니다. 시스템 재고에 이전 조정이 이미 반영되어 있으므로 이중 계산은 발생하지 않습니다.

3. **StockLedger 감사 추적**: 모든 조정은 `ref_type='DAILY_COUNT'`로 기록되어, 실사로 인한 조정을 추적할 수 있습니다.

4. **API 하위호환**:
   - `GET /daily-counts/monthly`: 기존 필드 유지, 신규 필드 추가 (nullable)
   - `PUT /daily-counts`: storeId 파라미터 optional, 미전달 시 기존 동작 유지

---

## 7. 향후 개선 후보

- [ ] 차이 임계값 설정: 차이가 일정 % 이상이면 관리자 알림
- [ ] 자동 조정 on/off: 관리자 설정으로 자동 조정 여부 선택
- [ ] 실사 이력 리포트: 품목별 차이 추이 차트
- [ ] 실사 승인 워크플로: 대규모 차이 시 관리자 승인 필요
