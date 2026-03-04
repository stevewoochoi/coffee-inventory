# TASK_MENU_RESTRUCTURE.md — 상단 메뉴 그룹화 작업 지시서

> **목적**: AdminLayout 상단 메뉴 16개 1단 나열 → 6개 그룹 + 드롭다운으로 재구조화
> **전제**: V6 코드 배포 완료 상태. 라우트/페이지 변경 없이 메뉴 표시만 변경.

---

## 실행 프롬프트

```
docs/TASK_MENU_RESTRUCTURE.md를 읽고 AdminLayout 상단 메뉴를 그룹화해줘.

프로젝트: /home/ubuntu/coffee-inventory
기존 구현: V6 완료 상태

핵심 변경:
1. 기존 AdminLayout.tsx의 navKeys 1단 배열 → 6개 그룹 드롭다운 구조로 교체
2. NavDropdown 컴포넌트 신규 생성
3. 역할별 메뉴 필터링
4. 모바일 아코디언 메뉴
5. i18n 키 추가

기존 라우트(App.tsx)는 건드리지 마. 메뉴 UI만 변경.
```

---

## 변경 전 → 후

```
Before (16개 1단 나열):
[대시보드][부재료][포장단위][공급사][카테고리][발주][발주달력][마감관리]
[재무대시보드][매입관리][재고자산][월마감][일괄업로드][유통기한][사용자][설정]

After (6개 그룹 + 드롭다운):
[대시보드] [상품관리▾] [발주운영▾] [재고▾] [재무▾] [설정▾]
```

---

## 파일별 작업

### 1. 신규 생성: `frontend/src/config/adminNavigation.ts`

```typescript
import {
  Home, Package, ShoppingCart, Warehouse,
  DollarSign, Settings, Box, Tag, Truck,
  Calendar, Lock, ClipboardList, BarChart,
  Upload, Timer, Users, Palette, FileText,
  Database, ShoppingBag, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  to: string;
  icon: LucideIcon;
  roles?: string[];
}

export interface NavGroup {
  key: string;
  icon: LucideIcon;
  to?: string;           // 하위 없이 직접 이동 (대시보드)
  children?: NavItem[];
  roles: string[];
}

export const adminNavGroups: NavGroup[] = [
  // ① 대시보드 — 단독
  {
    key: 'nav.dashboard',
    icon: Home,
    to: '/admin/dashboard',
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY','KR_FINANCE','JP_ORDERER','FULFILLMENT'],
  },

  // ② 상품관리
  {
    key: 'nav.group.product',
    icon: Package,
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'],
    children: [
      { key: 'nav.items',      to: '/admin/items',       icon: Box },
      { key: 'nav.packagings', to: '/admin/packagings',  icon: Tag },
      { key: 'nav.categories', to: '/admin/categories',  icon: ClipboardList },
      { key: 'nav.suppliers',  to: '/admin/suppliers',   icon: Truck },
    ],
  },

  // ③ 발주운영
  {
    key: 'nav.group.ordering',
    icon: ShoppingCart,
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY','FULFILLMENT'],
    children: [
      { key: 'nav.ordering',       to: '/admin/ordering',           icon: ClipboardList,
        roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'] },
      { key: 'nav.orderCalendar',  to: '/admin/ordering/calendar',  icon: Calendar,
        roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'] },
      { key: 'nav.cutoff',         to: '/admin/ordering/cutoff',    icon: Lock,
        roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'] },
      { key: 'nav.supplierOrders', to: '/supplier-portal/orders',   icon: ShoppingBag,
        roles: ['SUPER_ADMIN','BRAND_ADMIN','FULFILLMENT'] },
    ],
  },

  // ④ 재고
  {
    key: 'nav.group.inventory',
    icon: Warehouse,
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'],
    children: [
      { key: 'nav.inventory',  to: '/admin/inventory',    icon: BarChart },
      { key: 'nav.expiry',     to: '/admin/expiry',       icon: Timer },
      { key: 'nav.bulkUpload', to: '/admin/bulk-upload',  icon: Upload },
    ],
  },

  // ⑤ 재무
  {
    key: 'nav.group.finance',
    icon: DollarSign,
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_FINANCE'],
    children: [
      { key: 'nav.financeDashboard', to: '/admin/finance/dashboard',       icon: DollarSign },
      { key: 'nav.purchase',         to: '/admin/finance/purchase',        icon: FileText },
      { key: 'nav.inventoryValue',   to: '/admin/finance/inventory-value', icon: Database },
      { key: 'nav.closing',          to: '/admin/finance/closing',         icon: Lock },
    ],
  },

  // ⑥ 설정
  {
    key: 'nav.group.settings',
    icon: Settings,
    roles: ['SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY'],
    children: [
      { key: 'nav.users',          to: '/admin/settings/users',           icon: Users },
      { key: 'nav.theme',          to: '/admin/settings/theme',           icon: Palette },
      { key: 'nav.deliveryPolicy', to: '/admin/settings/delivery-policy', icon: Truck,
        roles: ['SUPER_ADMIN','BRAND_ADMIN'] },
    ],
  },
];
```

---

### 2. 신규 생성: `frontend/src/components/nav/NavDropdown.tsx`

기능 요구사항:
```
- 데스크톱: hover 시 드롭다운 펼침 (200ms onMouseEnter delay)
- 클릭으로도 토글 가능
- 외부 클릭 시 닫힘 (useRef + useEffect)
- 현재 하위 라우트 active 시 → 그룹 라벨도 active 스타일 (font-bold, underline)
- 드롭다운 내 각 항목: 좌측 아이콘(16px) + 라벨
- 현재 페이지 항목: bg-accent, font-semibold
- 드롭다운 위치: 그룹 라벨 바로 아래, 좌측 정렬
- 최소 너비 180px, 그림자 shadow-lg, rounded-lg
- z-index: 50 (다른 요소 위에)
- 애니메이션: opacity + translateY transition (150ms)
```

```typescript
// 핵심 구조
interface NavDropdownProps {
  group: NavGroup;
  userRole: string;
}

export function NavDropdown({ group, userRole }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t } = useTranslation();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 하위 라우트 중 현재 페이지가 있는지
  const isGroupActive = group.children?.some(child =>
    location.pathname.startsWith(child.to)
  );

  // 역할 기반 필터링
  const visibleChildren = group.children?.filter(child =>
    !child.roles || child.roles.includes(userRole)
  );

  // hover 열기 (200ms delay)
  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 200);
  };

  // hover 닫기 (150ms delay — 마우스가 드롭다운으로 이동할 시간)
  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 단독 링크 (대시보드처럼 children 없는 경우)
  if (group.to) {
    return (
      <NavLink to={group.to} className={...}>
        {t(group.key)}
      </NavLink>
    );
  }

  return (
    <div ref={ref} className="relative"
         onMouseEnter={handleMouseEnter}
         onMouseLeave={handleMouseLeave}>
      {/* 그룹 라벨 */}
      <button onClick={() => setOpen(!open)}
              className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1
                ${isGroupActive ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10'}`}>
        {t(group.key)}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-white rounded-lg shadow-lg
                        border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
          {visibleChildren?.map(child => (
            <NavLink key={child.to} to={child.to}
                     onClick={() => setOpen(false)}
                     className={({ isActive }) =>
                       `flex items-center gap-2 px-4 py-2.5 text-sm transition-colors
                        ${isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-gray-700 hover:bg-gray-50'}`
                     }>
              <child.icon className="w-4 h-4" />
              {t(child.key)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 3. 신규 생성: `frontend/src/hooks/useFilteredNav.ts`

```typescript
import { adminNavGroups, type NavGroup } from '@/config/adminNavigation';

export function useFilteredNav(userRole: string): NavGroup[] {
  return adminNavGroups
    .filter(group => group.roles.includes(userRole))
    .map(group => ({
      ...group,
      children: group.children?.filter(child =>
        !child.roles || child.roles.includes(userRole)
      ),
    }))
    .filter(group => group.to || (group.children && group.children.length > 0));
}
```

---

### 4. 수정: `frontend/src/components/AdminLayout.tsx`

핵심 변경:
```
- 기존 navKeys 배열 삭제
- import { adminNavGroups } from '@/config/adminNavigation'
- import { useFilteredNav } from '@/hooks/useFilteredNav'
- import { NavDropdown } from './nav/NavDropdown'

- 데스크톱 nav 영역:
  기존: navKeys.map(item => <NavLink ...>)
  변경: filteredGroups.map(group => <NavDropdown group={group} userRole={role} />)

- 모바일 슬라이드 메뉴:
  기존: navKeys.map(item => <NavLink ...>)
  변경: 아코디언 그룹 (그룹 클릭 → 하위 펼침/접힘)
```

**모바일 메뉴 아코디언**:
```typescript
// 모바일 슬라이드 메뉴 내부
{filteredGroups.map(group => (
  group.to ? (
    // 단독 링크 (대시보드)
    <NavLink to={group.to} onClick={() => setMenuOpen(false)} className="...">
      <group.icon className="w-5 h-5" />
      {t(group.key)}
    </NavLink>
  ) : (
    // 아코디언 그룹
    <MobileNavGroup key={group.key} group={group} userRole={role}
                    onNavigate={() => setMenuOpen(false)} />
  )
))}
```

```typescript
// components/nav/MobileNavGroup.tsx
function MobileNavGroup({ group, userRole, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  const isGroupActive = group.children?.some(c => location.pathname.startsWith(c.to));
  const visibleChildren = group.children?.filter(c => !c.roles || c.roles.includes(userRole));

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium
                ${isGroupActive ? 'text-white bg-white/20' : 'text-white/80'}`}>
        <span className="flex items-center gap-2">
          <group.icon className="w-5 h-5" />
          {t(group.key)}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="pl-8 py-1 space-y-0.5">
          {visibleChildren?.map(child => (
            <NavLink key={child.to} to={child.to} onClick={onNavigate}
                     className={({ isActive }) =>
                       `flex items-center gap-2 px-4 py-2.5 rounded text-sm
                        ${isActive ? 'text-white font-bold' : 'text-white/70'}`
                     }>
              <child.icon className="w-4 h-4" />
              {t(child.key)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 5. 수정: i18n 파일

**ko.json** — 기존 nav 키를 유지하고 group 키 추가:
```json
{
  "nav": {
    "dashboard": "대시보드",
    "group": {
      "product": "상품관리",
      "ordering": "발주운영",
      "inventory": "재고",
      "finance": "재무",
      "settings": "설정"
    },
    "items": "부재료",
    "packagings": "포장단위",
    "categories": "카테고리",
    "suppliers": "공급사",
    "ordering": "발주 현황",
    "orderCalendar": "발주 달력",
    "cutoff": "마감 관리",
    "supplierOrders": "수주 관리",
    "inventory": "재고 현황",
    "expiry": "유통기한",
    "bulkUpload": "일괄 업로드",
    "financeDashboard": "재무 대시보드",
    "purchase": "매입 관리",
    "inventoryValue": "재고자산 평가",
    "closing": "월마감",
    "users": "사용자 관리",
    "theme": "테마 설정",
    "deliveryPolicy": "배송 정책"
  }
}
```

**ja.json**:
```json
{
  "nav": {
    "dashboard": "ダッシュボード",
    "group": {
      "product": "商品管理",
      "ordering": "発注運営",
      "inventory": "在庫",
      "finance": "財務",
      "settings": "設定"
    },
    "items": "副資材",
    "packagings": "包装単位",
    "categories": "カテゴリ",
    "suppliers": "仕入先",
    "ordering": "発注一覧",
    "orderCalendar": "発注カレンダー",
    "cutoff": "締切管理",
    "supplierOrders": "受注管理",
    "inventory": "在庫状況",
    "expiry": "賞味期限",
    "bulkUpload": "一括アップロード",
    "financeDashboard": "財務ダッシュボード",
    "purchase": "仕入管理",
    "inventoryValue": "棚卸資産評価",
    "closing": "月次締め",
    "users": "ユーザー管理",
    "theme": "テーマ設定",
    "deliveryPolicy": "配送ポリシー"
  }
}
```

**en.json**:
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "group": {
      "product": "Products",
      "ordering": "Ordering",
      "inventory": "Inventory",
      "finance": "Finance",
      "settings": "Settings"
    },
    "items": "Items",
    "packagings": "Packaging",
    "categories": "Categories",
    "suppliers": "Suppliers",
    "ordering": "Orders",
    "orderCalendar": "Order Calendar",
    "cutoff": "Cutoff Mgmt",
    "supplierOrders": "Supplier Orders",
    "inventory": "Inventory",
    "expiry": "Expiry Alerts",
    "bulkUpload": "Bulk Upload",
    "financeDashboard": "Finance Dashboard",
    "purchase": "Purchases",
    "inventoryValue": "Inventory Value",
    "closing": "Monthly Close",
    "users": "Users",
    "theme": "Theme",
    "deliveryPolicy": "Delivery Policy"
  }
}
```

---

## 건드리지 않는 것

```
- App.tsx 라우트 정의 — 변경 없음
- 각 페이지 컴포넌트 — 변경 없음
- StoreLayout — 변경 없음 (매장용 네비게이션은 기존 유지)
- 백엔드 API — 변경 없음
```

---

## 검증

```
1. npm run build 성공
2. 데스크톱: 6개 그룹 hover 드롭다운 정상 동작
3. 모바일: 햄버거 → 아코디언 그룹 정상 동작
4. BRAND_ADMIN 로그인: 6개 그룹 전체 표시
5. KR_FINANCE 로그인: 대시보드 + 재무만 표시
6. FULFILLMENT 로그인: 대시보드 + 수주관리만 표시
7. 현재 페이지의 그룹 라벨이 active 스타일 적용
8. 기존 URL 직접 접근 (/admin/items 등) 정상 동작
```
