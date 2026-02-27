import client from './client';
import type { ApiResponse } from './auth';

export interface AuditLineResponse {
  id: number;
  itemId: number;
  itemName: string;
  systemQty: number;
  actualQty: number | null;
  difference: number | null;
  note: string | null;
}

export interface AuditResponse {
  id: number;
  storeId: number;
  auditDate: string;
  status: string;
  createdBy: number | null;
  completedBy: number | null;
  completedAt: string | null;
  note: string | null;
  lines: AuditLineResponse[];
  createdAt: string;
}

export interface AuditSummary {
  inProgress: number;
  completed: number;
  total: number;
}

export const auditApi = {
  create: (storeId: number, note?: string) =>
    client.post<ApiResponse<AuditResponse>>('/audit', { storeId, note }),

  getList: (storeId: number, status?: string) =>
    client.get<ApiResponse<AuditResponse[]>>('/audit', { params: { storeId, status } }),

  getDetail: (id: number) =>
    client.get<ApiResponse<AuditResponse>>(`/audit/${id}`),

  updateLine: (lineId: number, actualQty: number, note?: string) =>
    client.put<ApiResponse<AuditLineResponse>>(`/audit/lines/${lineId}`, { actualQty, note }),

  complete: (id: number, note?: string) =>
    client.put<ApiResponse<AuditResponse>>(`/audit/${id}/complete`, { note }),

  cancel: (id: number) =>
    client.post<ApiResponse<void>>(`/audit/${id}/cancel`),

  getSummary: (storeId: number) =>
    client.get<ApiResponse<AuditSummary>>('/audit/summary', { params: { storeId } }),
};
