import client from './client';
import type { ApiResponse } from './auth';

export interface DailyConsumption {
  date: string;
  totalQty: number;
}

export interface StoreDashboard {
  todayReceiveCount: number;
  todayWasteQty: number;
  lowStockCount: number;
  expiryAlertCount: number;
  dailyConsumption: DailyConsumption[];
  monthOrderCost: number;
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
