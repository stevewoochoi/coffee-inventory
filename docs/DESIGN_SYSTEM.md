# DESIGN_SYSTEM.md - 커피 재고관리 시스템

## 디자인 원칙

- **미니멀 & 클린**: 커피 브랜드 이미지에 맞는 세련된 UI
- **태블릿 퍼스트**: 매장 화면은 태블릿/터치 기반 UX 최우선
- **정보 밀도**: 관리자 화면은 데이터를 한눈에 볼 수 있게

---

## 컬러 팔레트

```
Primary:   #1E40AF (blue-800)   - 주요 버튼, 강조
Secondary: #3B82F6 (blue-500)   - 보조 버튼, 링크
Success:   #16A34A (green-600)  - 입고 완료, 성공
Warning:   #D97706 (amber-600)  - 저재고 경고
Danger:    #DC2626 (red-600)    - 에러, 삭제, 부족 재고
Neutral:   #6B7280 (gray-500)   - 비활성, 보조 텍스트
Background:#F9FAFB (gray-50)    - 페이지 배경
Surface:   #FFFFFF              - 카드/모달 배경
Border:    #E5E7EB (gray-200)   - 테두리
```

---

## 공통 컴포넌트 가이드

### 버튼

```jsx
// Primary
<Button className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg">
  저장
</Button>

// 태블릿용 (큰 버튼)
<Button className="bg-blue-800 text-white w-full py-5 text-xl rounded-xl">
  입고 확정
</Button>

// Danger
<Button variant="destructive">삭제</Button>
```

### 테이블 (관리자 화면)

```jsx
<Table>
  <TableHeader>
    <TableRow className="bg-gray-50">
      <TableHead>아이템명</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-blue-50">
      <TableCell>우유</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 재고 상태 뱃지

```jsx
// 정상
<Badge className="bg-green-100 text-green-700">정상</Badge>
// 부족
<Badge className="bg-red-100 text-red-700">부족</Badge>
// 경고
<Badge className="bg-amber-100 text-amber-700">주의</Badge>
```

---

## 페이지 레이아웃

### 관리자 (/admin)

```
┌─────────────────────────────────────────┐
│  LOGO    네비게이션 메뉴         사용자  │  ← Header (h-16, bg-white, shadow-sm)
├──────────┬──────────────────────────────┤
│          │                              │
│  사이드바 │   메인 콘텐츠                │
│  (w-64)  │   (max-w-7xl, px-8, py-6)   │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 태블릿 매장 (/store)

```
┌─────────────────────────────────┐
│  매장명          오늘 날짜/시간  │  ← Header (h-20, bg-blue-800, text-white)
├─────────────────────────────────┤
│                                 │
│   메인 콘텐츠 (풀스크린)         │
│   패딩 px-4 py-4                │
│                                 │
├─────────────────────────────────┤
│  재고  입고  폐기  발주          │  ← Bottom Nav (h-20, 아이콘+텍스트)
└─────────────────────────────────┘
```

---

## 태블릿 UX 규칙

- 버튼 최소 높이: `py-4` (48px 이상)
- 폼 인풋 최소 높이: `h-14` (56px)
- 폰트 크기: 최소 `text-base` (16px), 중요 정보는 `text-lg` 이상
- 터치 타겟 간격: 최소 `gap-4` (16px)
- 스캔 결과 표시: 전체 화면의 50% 이상 차지, 명확하게

---

## 화면별 UI 패턴

### 재고 현황 카드

```jsx
<Card className="p-6">
  <div className="flex justify-between items-start">
    <div>
      <p className="text-sm text-gray-500">우유</p>
      <p className="text-3xl font-bold text-gray-900">24 EA</p>
    </div>
    <Badge className="bg-amber-100 text-amber-700">주의</Badge>
  </div>
  <p className="text-xs text-gray-400 mt-2">최저재고: 10 EA</p>
</Card>
```

### 스캔 화면 (태블릿)

```jsx
<div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
  {/* 카메라 뷰파인더 영역 */}
  <div className="w-80 h-80 border-4 border-blue-400 rounded-2xl mb-8" />
  
  {/* 스캔 결과 */}
  <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
    <p className="text-2xl font-bold">우유 1박스 (12EA)</p>
    <p className="text-gray-500">롯데 신선 우유 200ml</p>
  </div>
  
  {/* 확인 버튼 */}
  <Button className="mt-4 w-full max-w-sm py-5 text-xl bg-blue-800">
    ✅ 입고 등록
  </Button>
</div>
```
