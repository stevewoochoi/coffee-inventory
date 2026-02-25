import client from './client';
import type { ApiResponse } from './auth';

export interface OrderPlan {
  id: number;
  storeId: number;
  supplierId: number;
  status: string;
  recommendedByAi: boolean;
  createdAt: string;
}

export interface OrderLineDto {
  packagingId: number;
  packQty: number;
}

export interface SuggestionLine {
  packagingId: number;
  itemId: number;
  itemName: string;
  packName: string;
  unitsPerPack: number;
  currentStock: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  suggestedPackQty: number;
}

export interface OrderSuggestion {
  storeId: number;
  supplierId: number;
  lines: SuggestionLine[];
}

export const orderingApi = {
  getPlans: (storeId: number) =>
    client.get<ApiResponse<OrderPlan[]>>('/ordering/plans', { params: { storeId } }),

  getPlan: (id: number) =>
    client.get<ApiResponse<OrderPlan>>(`/ordering/plans/${id}`),

  createPlan: (data: { storeId: number; supplierId: number; lines?: OrderLineDto[] }) =>
    client.post<ApiResponse<OrderPlan>>('/ordering/plans', data),

  confirmPlan: (id: number) =>
    client.put<ApiResponse<OrderPlan>>(`/ordering/plans/${id}/confirm`),

  dispatchPlan: (id: number) =>
    client.post<ApiResponse<OrderPlan>>(`/ordering/plans/${id}/dispatch`),

  getSuggestion: (storeId: number, supplierId: number) =>
    client.get<ApiResponse<OrderSuggestion>>('/ordering/suggestion', {
      params: { storeId, supplierId },
    }),

  downloadPdf: (planId: number) =>
    client.get<Blob>(`/ordering/plans/${planId}/pdf`, {
      responseType: 'blob',
    }),
};
