import client from './client';
import type { ApiResponse } from './auth';

export interface PhysicalCountLine {
  id: number;
  countId: number;
  itemId: number;
  systemQty: number;
  actualQty: number | null;
  gapQty: number | null;
  note: string | null;
}

export interface PhysicalCount {
  id: number;
  storeId: number;
  countDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  countedBy: number | null;
  completedAt: string | null;
  createdAt: string;
  lines: PhysicalCountLine[];
}

export const physicalCountApi = {
  start: (storeId: number, countedBy: number) =>
    client.post<ApiResponse<PhysicalCount>>('/physical-count/start', { storeId, countedBy }),

  getById: (id: number) =>
    client.get<ApiResponse<PhysicalCount>>(`/physical-count/${id}`),

  updateLine: (countId: number, lineId: number, data: { actualQty: number; note?: string }) =>
    client.put<ApiResponse<PhysicalCountLine>>(`/physical-count/${countId}/lines/${lineId}`, data),

  complete: (id: number) =>
    client.post<ApiResponse<PhysicalCount>>(`/physical-count/${id}/complete`),

  getHistory: (storeId: number) =>
    client.get<ApiResponse<PhysicalCount[]>>('/physical-count/history', { params: { storeId } }),
};
