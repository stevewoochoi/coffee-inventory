import client from './client';
import type { ApiResponse } from './auth';

export interface DailyConsumption {
  date: string;
  totalQty: number;
}

export interface StockStatus {
  totalItems: number;
  normalCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
}

export interface RecentOrder {
  id: number;
  status: string;
  supplierName: string;
  totalAmount: number;
  createdAt: string;
  deliveryDate: string | null;
  itemCount: number;
}

export interface TopConsumption {
  itemId: number;
  itemName: string;
  totalQty: number;
  baseUnit: string;
}

export interface StoreDashboard {
  todayReceiveCount: number;
  todayWasteQty: number;
  lowStockCount: number;
  expiryAlertCount: number;
  dailyConsumption: DailyConsumption[];
  monthOrderCost: number;
  urgentOrderCount: number;
  recommendedOrderCount: number;
  pendingReceivingCount: number;
  pendingCartCount: number;
  pendingClaimCount: number;
  stockStatus: StockStatus | null;
  topConsumption: TopConsumption[];
  recentOrders: RecentOrder[];
  // V6 fields
  recentOrderDate: string | null;
  recentReceivingDate: string | null;
  monthlyOrderCount: number;
  monthlyOrderAmount: number;
  nextDeliveryDate: string | null;
  nextDeadline: string | null;
}

export interface StoreSummary {
  storeId: number;
  storeName: string;
  lowStockCount: number;
  expiryAlertCount: number;
  monthOrderCost: number;
}

export interface BrandDashboard {
  storeSummaries: StoreSummary[];
  totalOrderCost: number;
}

export const dashboardApi = {
  getStoreDashboard: (storeId: number) =>
    client.get<ApiResponse<StoreDashboard>>(`/dashboard/store/${storeId}`),

  getBrandDashboard: (brandId: number) =>
    client.get<ApiResponse<BrandDashboard>>(`/dashboard/brand/${brandId}`),
};
