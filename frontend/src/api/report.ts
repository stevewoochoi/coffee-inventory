import client from './client';
import type { ApiResponse } from './auth';

export interface ItemConsumption {
  itemId: number;
  itemName: string;
  totalQty: number;
}

export interface ConsumptionReport {
  storeId: number;
  from: string;
  to: string;
  items: ItemConsumption[];
  totalQty: number;
}

export interface ItemWaste {
  itemId: number;
  itemName: string;
  totalQty: number;
  topReason: string | null;
}

export interface WasteReport {
  storeId: number;
  from: string;
  to: string;
  items: ItemWaste[];
  totalQty: number;
}

export interface ItemLossRate {
  itemId: number;
  itemName: string;
  receivedQty: number;
  wastedQty: number;
  lossRate: number;
}

export interface LossRateReport {
  storeId: number;
  items: ItemLossRate[];
}

export interface OrderCostLine {
  itemId: number;
  itemName: string;
  packName: string;
  totalPackQty: number;
  unitPrice: number;
  lineCost: number;
}

export interface OrderCostReport {
  storeId: number;
  month: string;
  lines: OrderCostLine[];
  totalCost: number;
  totalOrders: number;
}

export const reportApi = {
  getConsumption: (storeId: number, from: string, to: string) =>
    client.get<ApiResponse<ConsumptionReport>>('/reports/consumption', {
      params: { storeId, from, to },
    }),

  getWaste: (storeId: number, from: string, to: string) =>
    client.get<ApiResponse<WasteReport>>('/reports/waste', {
      params: { storeId, from, to },
    }),

  getLossRate: (storeId: number) =>
    client.get<ApiResponse<LossRateReport>>('/reports/loss-rate', {
      params: { storeId },
    }),

  getOrderCost: (storeId: number, month: string) =>
    client.get<ApiResponse<OrderCostReport>>('/reports/order-cost', {
      params: { storeId, month },
    }),

  downloadPdf: (storeId: number, params: Record<string, string>) =>
    client.get('/reports/pdf', {
      params: { storeId, ...params },
      responseType: 'blob',
    }),
};
