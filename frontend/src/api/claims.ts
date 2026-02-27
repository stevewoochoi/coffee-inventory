import client from './client';
import type { ApiResponse } from './auth';

export interface ClaimLineInput {
  itemId: number;
  packagingId?: number;
  claimedQty: number;
  reason?: string;
}

export interface CreateClaimRequest {
  storeId: number;
  orderPlanId?: number;
  deliveryId?: number;
  claimType: string;
  description?: string;
  requestedAction?: string;
  lines: ClaimLineInput[];
}

export interface ResolveClaimRequest {
  status: string;
  resolutionNote?: string;
  lines?: { claimLineId: number; acceptedQty: number }[];
}

export interface ClaimLineResponse {
  id: number;
  itemId: number;
  itemName: string;
  packagingId: number | null;
  packName: string | null;
  claimedQty: number;
  acceptedQty: number | null;
  reason: string | null;
}

export interface ClaimImageResponse {
  id: number;
  imageUrl: string;
  uploadedAt: string;
}

export interface ClaimResponse {
  id: number;
  storeId: number;
  orderPlanId: number | null;
  deliveryId: number | null;
  claimType: string;
  status: string;
  description: string | null;
  requestedAction: string | null;
  createdBy: number | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  lines: ClaimLineResponse[];
  images: ClaimImageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ClaimSummary {
  submitted: number;
  inReview: number;
  resolved: number;
  total: number;
}

export const claimsApi = {
  create: (data: CreateClaimRequest) =>
    client.post<ApiResponse<ClaimResponse>>('/claims', data),

  getList: (storeId: number, status?: string) =>
    client.get<ApiResponse<ClaimResponse[]>>('/claims', { params: { storeId, status } }),

  getDetail: (id: number) =>
    client.get<ApiResponse<ClaimResponse>>(`/claims/${id}`),

  resolve: (id: number, data: ResolveClaimRequest) =>
    client.put<ApiResponse<ClaimResponse>>(`/claims/${id}/resolve`, data),

  addImage: (id: number, imageUrl: string) =>
    client.post<ApiResponse<ClaimImageResponse>>(`/claims/${id}/images`, { imageUrl }),

  getCategories: () =>
    client.get<ApiResponse<string[]>>('/claims/categories'),

  getSummary: (storeId: number) =>
    client.get<ApiResponse<ClaimSummary>>('/claims/summary', { params: { storeId } }),
};
