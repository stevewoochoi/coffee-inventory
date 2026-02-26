import client from './client';
import type { ApiResponse } from './auth';

export interface UserStoreInfo {
  storeId: number;
  storeName: string;
  isPrimary: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  companyId?: number;
  brandId?: number;
  storeId?: number;
  accountStatus: string;
  isActive: boolean;
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: number;
  rejectedReason?: string;
  stores?: UserStoreInfo[];
}

export interface UserListResponse {
  content: UserResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApproveRequest {
  role: string;
  brandId?: number;
  storeIds?: number[];
}

export interface RejectRequest {
  reason: string;
}

export interface SelectOption {
  id: number;
  name: string;
}

export const adminUserApi = {
  getUsers: (params: { status?: string; role?: string; search?: string; page?: number; size?: number }) =>
    client.get<ApiResponse<UserListResponse>>('/admin/users', { params }),

  getUser: (id: number) =>
    client.get<ApiResponse<UserResponse>>(`/admin/users/${id}`),

  approve: (id: number, data: ApproveRequest) =>
    client.put<ApiResponse<UserResponse>>(`/admin/users/${id}/approve`, data),

  reject: (id: number, data: RejectRequest) =>
    client.put<ApiResponse<UserResponse>>(`/admin/users/${id}/reject`, data),
};
