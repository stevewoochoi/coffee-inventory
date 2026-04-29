import client from './client';
import type { ApiResponse } from './auth';
import type { Page } from './master';

export interface Warehouse {
  id: number;
  brandId: number | null;
  name: string;
  storeType: string;
  isInternalWarehouse: boolean;
  status: string;
  timezone: string;
}

export interface ItemForecast {
  itemId: number;
  itemName: string;
  category: string | null;
  baseUnit: string;
  currentStock: number;
  minStock: number;
  avgDailyUsage: number;
  daysUntilEmpty: number;
  fillPercentage: number;
  trend: string;
}

export interface ForecastResponse {
  storeId: number;
  items: ItemForecast[];
}

export interface InventoryLot {
  id: number;
  storeId: number;
  itemId: number;
  qtyBaseUnit: number;
  expDate: string | null;
  lotNo: string | null;
}

export interface StockLedgerEntry {
  id: number;
  storeId: number;
  itemId: number;
  qtyBaseUnit: number;
  expDate: string | null;
  lotNo: string | null;
  type: string;
  refType: string | null;
  refId: number | null;
  memo: string | null;
  createdAt: string;
  createdBy: number | null;
}

export interface AdjustRequest {
  itemId: number;
  qtyDelta: number;
  expDate?: string;
  lotNo?: string;
  reason?: string;
  memo?: string;
}

export interface SupplierBrief {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  internalWarehouseStoreId: number | null;
}

export interface WarehouseOrderRequest {
  supplierId: number;
  storeId?: number;
  lines: { packagingId: number; packQty: number }[];
}

export const warehouseApi = {
  list: () =>
    client.get<ApiResponse<Warehouse[]>>('/admin/warehouses'),

  getInventory: (warehouseId: number) =>
    client.get<ApiResponse<ForecastResponse>>(`/admin/warehouses/${warehouseId}/inventory`),

  getLots: (warehouseId: number, itemId: number) =>
    client.get<ApiResponse<InventoryLot[]>>(`/admin/warehouses/${warehouseId}/inventory/lots`,
      { params: { itemId } }),

  getLedger: (warehouseId: number, itemId?: number, page = 0, size = 30) =>
    client.get<ApiResponse<Page<StockLedgerEntry>>>(`/admin/warehouses/${warehouseId}/inventory/ledger`,
      { params: { itemId, page, size, sort: 'createdAt,desc' } }),

  adjust: (warehouseId: number, body: AdjustRequest) =>
    client.post<ApiResponse<void>>(`/admin/warehouses/${warehouseId}/inventory/adjust`, body),

  // orders
  getExternalSuppliers: (warehouseId: number) =>
    client.get<ApiResponse<SupplierBrief[]>>(`/admin/warehouses/${warehouseId}/orders/catalog/suppliers`),

  listOrders: (warehouseId: number) =>
    client.get<ApiResponse<unknown[]>>(`/admin/warehouses/${warehouseId}/orders`),

  createOrder: (warehouseId: number, body: WarehouseOrderRequest) =>
    client.post<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/orders`, body),

  cancelOrder: (warehouseId: number, orderId: number) =>
    client.post<ApiResponse<void>>(`/admin/warehouses/${warehouseId}/orders/${orderId}/cancel`),

  // receiving
  pendingReceipts: (warehouseId: number) =>
    client.get<ApiResponse<unknown[]>>(`/admin/warehouses/${warehouseId}/receiving/pending`),

  receiveFromOrder: (warehouseId: number, orderId: number, body: unknown) =>
    client.post<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/receiving/from-order/${orderId}`, body),

  confirmDelivery: (warehouseId: number, deliveryId: number) =>
    client.post<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/receiving/deliveries/${deliveryId}/confirm`),

  // cycle count
  startCycleCount: (warehouseId: number, gradeFilter?: string, zoneFilter?: string) =>
    client.post<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/cycle-count`,
      null, { params: { gradeFilter, zoneFilter } }),

  listActiveCycleCounts: (warehouseId: number) =>
    client.get<ApiResponse<unknown[]>>(`/admin/warehouses/${warehouseId}/cycle-count/active`),

  cycleCountHistory: (warehouseId: number, page = 0, size = 20) =>
    client.get<ApiResponse<Page<unknown>>>(`/admin/warehouses/${warehouseId}/cycle-count`,
      { params: { page, size } }),

  getCycleCount: (warehouseId: number, sessionId: number) =>
    client.get<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/cycle-count/${sessionId}`),

  updateCycleCountLine: (warehouseId: number, lineId: number, countedQty?: number, note?: string) =>
    client.put<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/cycle-count/lines/${lineId}`,
      null, { params: { countedQty, note } }),

  completeCycleCount: (warehouseId: number, sessionId: number, applyAdjustments = true) =>
    client.post<ApiResponse<unknown>>(`/admin/warehouses/${warehouseId}/cycle-count/${sessionId}/complete`,
      null, { params: { applyAdjustments } }),
};
