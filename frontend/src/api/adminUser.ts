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

export interface UpdateRequest {
  name?: string;
  role?: string;
  brandId?: number;
  storeIds?: number[];
  accountStatus?: string;
}

export interface StoreMapping {
  storeId: number;
  isPrimary: boolean;
}

export interface UserStoresUpdateRequest {
  storeIds: StoreMapping[];
}

export interface ManagerMapping {
  userId: number;
  isPrimary: boolean;
}

export interface StoreManagersUpdateRequest {
  managerIds: ManagerMapping[];
}

export interface StoreManagerInfo {
  userId: number;
  userName: string;
  userEmail: string;
  isPrimary: boolean;
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

  update: (id: number, data: UpdateRequest) =>
    client.put<ApiResponse<UserResponse>>(`/admin/users/${id}`, data),

  suspend: (id: number) =>
    client.put<ApiResponse<UserResponse>>(`/admin/users/${id}/suspend`),

  delete: (id: number) =>
    client.delete<ApiResponse<void>>(`/admin/users/${id}`),

  updateUserStores: (id: number, data: UserStoresUpdateRequest) =>
    client.put<ApiResponse<UserResponse>>(`/admin/users/${id}/stores`, data),

  getStoreManagers: (storeId: number) =>
    client.get<ApiResponse<StoreManagerInfo[]>>(`/admin/stores/${storeId}/managers`),

  updateStoreManagers: (storeId: number, data: StoreManagersUpdateRequest) =>
    client.put<ApiResponse<StoreManagerInfo[]>>(`/admin/stores/${storeId}/managers`, data),
};
