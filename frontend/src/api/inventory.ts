import client from './client';
import type { ApiResponse } from './auth';
import type { Page } from './master';

export interface InventorySnapshot {
  id: number;
  storeId: number;
  itemId: number;
  expDate: string | null;
  lotNo: string | null;
  qtyBaseUnit: number;
  updatedAt: string;
}

export interface StockLedger {
  id: number;
  storeId: number;
  itemId: number;
  qtyBaseUnit: number;
  type: string;
  refType: string | null;
  refId: number | null;
  memo: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface Delivery {
  id: number;
  storeId: number;
  supplierId: number;
  expectedAt: string | null;
  status: string;
  createdAt: string;
}

export interface DeliveryScan {
  id: number;
  deliveryId: number;
  packagingId: number;
  lotNo: string | null;
  expDate: string | null;
  packCountScanned: number;
  scannedAt: string;
}

export interface ExpiryAlert {
  id: number;
  storeId: number;
  itemId: number;
  lotNo: string | null;
  expDate: string;
  qtyBaseUnit: number;
  alertStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
  notifiedAt: string | null;
  createdAt: string;
}

export interface LowStockItem {
  itemId: number;
  itemName: string;
  baseUnit: string;
  currentQty: number;
  minStockQty: number;
  deficit: number;
}

export interface WasteRecord {
  id: number;
  storeId: number;
  itemId: number;
  qtyBaseUnit: number;
  reason: string | null;
  wasteType: string;
  createdBy: number | null;
  createdAt: string;
}

// Forecast types
export interface ItemForecast {
  itemId: number;
  itemName: string;
  category: string;
  baseUnit: string;
  currentStock: number;
  minStock: number;
  avgDailyUsage: number;
  daysUntilEmpty: number;
  fillPercentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface ForecastResponse {
  storeId: number;
  items: ItemForecast[];
}

export interface AdjustResponse {
  storeId: number;
  itemId: number;
  previousQty: number;
  newQty: number;
  delta: number;
}

// Order Receiving types
export interface PendingOrderLine {
  packagingId: number;
  packName: string;
  itemName: string;
  orderedPackQty: number;
}

export interface PendingOrder {
  orderPlanId: number;
  supplierId: number;
  supplierName: string;
  status: string;
  lines: PendingOrderLine[];
  createdAt: string;
}

export const inventoryApi = {
  getSnapshot: (storeId: number) =>
    client.get<ApiResponse<InventorySnapshot[]>>('/inventory/snapshot', { params: { storeId } }),

  getLedger: (storeId: number, itemId?: number, page = 0) =>
    client.get<ApiResponse<Page<StockLedger>>>('/inventory/ledger', { params: { storeId, itemId, page, size: 50 } }),

  // Delivery
  getDeliveries: (storeId: number) =>
    client.get<ApiResponse<Delivery[]>>('/receiving/deliveries', { params: { storeId } }),
  getDeliveryHistory: (storeId: number, from: string, to: string, status?: string) =>
    client.get<ApiResponse<Delivery[]>>('/receiving/deliveries/history', { params: { storeId, from, to, ...(status ? { status } : {}) } }),
  createDelivery: (data: { storeId: number; supplierId: number; expectedAt?: string }) =>
    client.post<ApiResponse<Delivery>>('/receiving/deliveries', data),
  getDelivery: (id: number) =>
    client.get<ApiResponse<Delivery>>(`/receiving/deliveries/${id}`),
  addScan: (deliveryId: number, data: { packagingId: number; packCountScanned?: number; lotNo?: string }) =>
    client.post<ApiResponse<DeliveryScan>>(`/receiving/deliveries/${deliveryId}/scans`, data),
  getScans: (deliveryId: number) =>
    client.get<ApiResponse<DeliveryScan[]>>(`/receiving/deliveries/${deliveryId}/scans`),
  confirmDelivery: (deliveryId: number) =>
    client.put<ApiResponse<Delivery>>(`/receiving/deliveries/${deliveryId}/confirm`),

  // Waste
  getWastes: (storeId: number) =>
    client.get<ApiResponse<WasteRecord[]>>('/waste', { params: { storeId } }),
  createWaste: (data: { storeId: number; itemId: number; qtyBaseUnit: number; reason?: string; wasteType?: string }) =>
    client.post<ApiResponse<WasteRecord>>('/waste', data),

  // Expiry Alerts
  getExpiryAlerts: (storeId: number) =>
    client.get<ApiResponse<ExpiryAlert[]>>('/inventory/expiry-alerts', { params: { storeId } }),

  // Low Stock
  getLowStock: (storeId: number) =>
    client.get<ApiResponse<LowStockItem[]>>('/inventory/low-stock', { params: { storeId } }),

  // Lot Snapshots
  getSnapshotLots: (storeId: number, itemId: number) =>
    client.get<ApiResponse<InventorySnapshot[]>>('/inventory/snapshot/lots', { params: { storeId, itemId } }),

  // Forecast
  getForecast: (storeId: number, brandId?: number) =>
    client.get<ApiResponse<ForecastResponse>>('/inventory/forecast', { params: { storeId, brandId } }),

  // Adjust
  adjustStock: (data: { storeId: number; itemId: number; newQtyBaseUnit: number; memo?: string }) =>
    client.post<ApiResponse<AdjustResponse>>('/inventory/adjust', data),

  // Order Receiving
  getPendingOrders: (storeId: number) =>
    client.get<ApiResponse<PendingOrder[]>>('/receiving/pending-orders', { params: { storeId } }),
  receiveFromOrder: (orderPlanId: number, data: { lines: Array<{ packagingId: number; packQty: number; lotNo?: string; expDate?: string }> }) =>
    client.post<ApiResponse<Delivery>>(`/receiving/from-order/${orderPlanId}`, data),
};

// Cycle Count API
export interface CycleCountSession {
  id: number;
  storeId: number;
  gradeFilter: string | null;
  zoneFilter: string | null;
  status: string;
  countedBy: number | null;
  itemCount: number;
  completedCount: number;
  startedAt: string;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface CycleCountLine {
  id: number;
  sessionId: number;
  itemId: number;
  itemName: string;
  itemNameJa: string;
  systemQty: number | null;
  countedQty: number | null;
  varianceQty: number | null;
  stockUnit: string;
  storageZone: string;
  itemGrade: string;
  isAdjusted: boolean;
  adjustedAt: string | null;
  note: string | null;
}

export interface CycleCountSessionDetail extends CycleCountSession {
  lines: CycleCountLine[];
}

export const cycleCountApi = {
  startSession: (storeId: number, gradeFilter?: string, zoneFilter?: string, userId?: number) =>
    client.post<ApiResponse<CycleCountSessionDetail>>('/cycle-count/sessions', null, {
      params: { storeId, gradeFilter, zoneFilter, userId }
    }),
  getActiveSessions: (storeId: number) =>
    client.get<ApiResponse<CycleCountSession[]>>('/cycle-count/sessions', { params: { storeId } }),
  getSession: (sessionId: number) =>
    client.get<ApiResponse<CycleCountSessionDetail>>(`/cycle-count/sessions/${sessionId}`),
  getHistory: (storeId: number, page = 0, size = 10) =>
    client.get<ApiResponse<{ content: CycleCountSession[] }>>('/cycle-count/sessions/history', {
      params: { storeId, page, size }
    }),
  updateLine: (sessionId: number, lineId: number, countedQty: number | null, note?: string) =>
    client.put<ApiResponse<CycleCountLine>>(`/cycle-count/sessions/${sessionId}/lines/${lineId}`, {
      countedQty, note
    }),
  completeSession: (sessionId: number, applyAdjustments: boolean) =>
    client.post<ApiResponse<CycleCountSessionDetail>>(`/cycle-count/sessions/${sessionId}/complete`, {
      applyAdjustments
    }),
};

// Quick Receive API
export const quickConfirmDelivery = (deliveryId: number, data: {
  lines: Array<{ packagingId: number; receivedQty: number; expDate?: string }>;
  note?: string;
}) => client.post<ApiResponse<any>>(`/receiving/deliveries/${deliveryId}/quick-confirm`, data);

export const getPendingDeliveries = (storeId: number) =>
  client.get<ApiResponse<any[]>>('/receiving/deliveries/pending', { params: { storeId } });
