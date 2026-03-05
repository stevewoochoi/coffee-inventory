import {
  Home, Package, ShoppingCart, Warehouse,
  DollarSign, Settings, Box, Tag, Truck,
  Calendar, Lock, ClipboardList, BarChart,
  Upload, Timer, Users, Palette, ShoppingBag,
  FileText, Database, Store, type LucideIcon,
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
  to?: string;
  children?: NavItem[];
  roles: string[];
}

export const adminNavGroups: NavGroup[] = [
  {
    key: 'nav.dashboard',
    icon: Home,
    to: '/admin/dashboard',
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY', 'KR_FINANCE', 'JP_ORDERER', 'FULFILLMENT'],
  },
  {
    key: 'nav.group.product',
    icon: Package,
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'],
    children: [
      { key: 'nav.items', to: '/admin/items', icon: Box },
      { key: 'nav.packagings', to: '/admin/packagings', icon: Tag },
      { key: 'nav.categories', to: '/admin/categories', icon: ClipboardList },
      { key: 'nav.suppliers', to: '/admin/suppliers', icon: Truck },
    ],
  },
  {
    key: 'nav.group.ordering',
    icon: ShoppingCart,
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY', 'FULFILLMENT'],
    children: [
      { key: 'nav.ordering', to: '/admin/ordering', icon: ClipboardList,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'] },
      { key: 'nav.orderCalendar', to: '/admin/ordering/calendar', icon: Calendar,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'] },
      { key: 'nav.cutoff', to: '/admin/ordering/cutoff', icon: Lock,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'] },
      { key: 'nav.supplierOrders', to: '/supplier-portal/orders', icon: ShoppingBag,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'FULFILLMENT'] },
    ],
  },
  {
    key: 'nav.group.inventory',
    icon: Warehouse,
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'],
    children: [
      { key: 'nav.inventory', to: '/admin/inventory', icon: BarChart },
      { key: 'nav.expiry', to: '/admin/expiry', icon: Timer },
      { key: 'nav.bulkUpload', to: '/admin/bulk-upload', icon: Upload },
    ],
  },
  {
    key: 'nav.group.finance',
    icon: DollarSign,
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_FINANCE'],
    children: [
      { key: 'nav.financeDashboard', to: '/admin/finance/dashboard', icon: DollarSign },
      { key: 'nav.purchase', to: '/admin/finance/purchase', icon: FileText },
      { key: 'nav.inventoryValue', to: '/admin/finance/inventory-value', icon: Database },
      { key: 'nav.closing', to: '/admin/finance/closing', icon: Lock },
    ],
  },
  {
    key: 'nav.group.settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY'],
    children: [
      { key: 'nav.users', to: '/admin/settings/users', icon: Users },
      { key: 'nav.stores', to: '/admin/settings/stores', icon: Store,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN'] },
      { key: 'nav.theme', to: '/admin/settings/theme', icon: Palette },
      { key: 'nav.deliveryPolicy', to: '/admin/settings/delivery-policy', icon: Truck,
        roles: ['SUPER_ADMIN', 'BRAND_ADMIN'] },
    ],
  },
];
