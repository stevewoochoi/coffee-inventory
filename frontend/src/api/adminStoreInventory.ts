import client from './client';
import type { ApiResponse } from './auth';
import type { Page } from './master';
import type { ForecastResponse, StockLedgerEntry } from './warehouse';

export interface AdminStore {
  id: number;
  brandId: number | null;
  name: string;
  storeType: string;
  status: string;
  timezone: string;
  address?: string | null;
  phone?: string | null;
  openDate?: string | null;
  memo?: string | null;
}

export const adminStoreInventoryApi = {
  listStores: () =>
    client.get<ApiResponse<AdminStore[]>>('/admin/stores'),

  getInventory: (storeId: number) =>
    client.get<ApiResponse<ForecastResponse>>(`/admin/stores/${storeId}/inventory`),

  getLedger: (storeId: number, itemId?: number, page = 0, size = 30) =>
    client.get<ApiResponse<Page<StockLedgerEntry>>>(`/admin/stores/${storeId}/inventory/ledger`,
      { params: { itemId, page, size, sort: 'createdAt,desc' } }),

  exportExcel: (storeId: number) =>
    client.get(`/admin/stores/${storeId}/inventory/export`, { responseType: 'blob' }),
};
