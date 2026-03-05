import client from './client';
import type { ApiResponse } from './auth';

export interface Store {
  id: number;
  brandId: number;
  name: string;
  timezone: string;
  status: string;
  address: string | null;
  phone: string | null;
  openDate: string | null;
  memo: string | null;
  createdAt: string;
}

export interface StoreRequest {
  brandId: number;
  name: string;
  timezone?: string;
  status?: string;
  address?: string;
  phone?: string;
  openDate?: string;
  memo?: string;
}

export const storeApi = {
  getStores: (brandId?: number) =>
    client.get<ApiResponse<Store[]>>('/org/stores', { params: { brandId } }),

  getStore: (id: number) =>
    client.get<ApiResponse<Store>>(`/org/stores/${id}`),

  createStore: (data: StoreRequest) =>
    client.post<ApiResponse<Store>>('/org/stores', data),

  updateStore: (id: number, data: StoreRequest) =>
    client.put<ApiResponse<Store>>(`/org/stores/${id}`, data),

  deleteStore: (id: number) =>
    client.delete<ApiResponse<void>>(`/org/stores/${id}`),
};
