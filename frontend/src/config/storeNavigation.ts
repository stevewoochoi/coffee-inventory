import {
  Home, ShoppingCart, ClipboardList, Package,
  Warehouse, Timer, Trash2, BarChart,
  Menu, FileText, CalendarDays, type LucideIcon,
} from 'lucide-react';

export interface StoreNavItem {
  key: string;
  to: string;
  icon: LucideIcon;
}

export interface StoreNavGroup {
  key: string;
  icon: LucideIcon;
  to?: string;
  children?: StoreNavItem[];
}

/** Desktop header groups */
export const storeNavGroups: StoreNavGroup[] = [
  {
    key: 'nav.dashboard',
    icon: Home,
    to: '/store/dashboard',
  },
  {
    key: 'nav.store.group.ordering',
    icon: ShoppingCart,
    children: [
      { key: 'nav.store.newOrder', to: '/store/ordering/new', icon: ShoppingCart },
      { key: 'nav.ordering', to: '/store/ordering', icon: ClipboardList },
      { key: 'nav.receiving', to: '/store/receiving', icon: Package },
      { key: 'nav.claims', to: '/store/claims', icon: FileText },
    ],
  },
  {
    key: 'nav.store.group.inventory',
    icon: Warehouse,
    children: [
      { key: 'nav.inventory', to: '/store/inventory', icon: Warehouse },
      { key: 'nav.expiry', to: '/store/expiry', icon: Timer },
      { key: 'nav.count', to: '/store/physical-count', icon: ClipboardList },
      { key: 'nav.dailyCount', to: '/store/inventory/daily', icon: CalendarDays },
      { key: 'nav.waste', to: '/store/waste', icon: Trash2 },
    ],
  },
  {
    key: 'nav.reports',
    icon: BarChart,
    to: '/store/reports',
  },
];

/** Mobile bottom tab bar — 4 tabs */
export const storeBottomTabs: StoreNavItem[] = [
  { key: 'nav.store.home', to: '/store/dashboard', icon: Home },
  { key: 'nav.store.newOrder', to: '/store/ordering/new', icon: ShoppingCart },
  { key: 'nav.store.orderHistory', to: '/store/ordering', icon: ClipboardList },
  { key: 'nav.store.more', to: '/store/menu', icon: Menu },
];

/** Store menu page groups — all features in grid */
export const storeMenuGroups: { key: string; icon: LucideIcon; items: StoreNavItem[] }[] = [
  {
    key: 'storeMenu.ordering',
    icon: ShoppingCart,
    items: [
      { key: 'nav.store.newOrder', to: '/store/ordering/new', icon: ShoppingCart },
      { key: 'nav.ordering', to: '/store/ordering', icon: ClipboardList },
      { key: 'nav.receiving', to: '/store/receiving', icon: Package },
      { key: 'nav.claims', to: '/store/claims', icon: FileText },
    ],
  },
  {
    key: 'storeMenu.inventory',
    icon: Warehouse,
    items: [
      { key: 'nav.inventory', to: '/store/inventory', icon: Warehouse },
      { key: 'nav.expiry', to: '/store/expiry', icon: Timer },
      { key: 'nav.count', to: '/store/physical-count', icon: ClipboardList },
      { key: 'nav.dailyCount', to: '/store/inventory/daily', icon: CalendarDays },
      { key: 'nav.waste', to: '/store/waste', icon: Trash2 },
    ],
  },
  {
    key: 'storeMenu.reports',
    icon: BarChart,
    items: [
      { key: 'nav.reports', to: '/store/reports', icon: BarChart },
    ],
  },
];
