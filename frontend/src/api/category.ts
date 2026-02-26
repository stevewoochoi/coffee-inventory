import client from './client';
import type { ApiResponse } from './auth';

export interface ItemCategory {
  id: number;
  brandId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export const categoryApi = {
  getCategories: (brandId: number) =>
    client.get<ApiResponse<ItemCategory[]>>('/master/categories', { params: { brandId } }),

  getAllCategories: (brandId: number) =>
    client.get<ApiResponse<ItemCategory[]>>('/master/categories/all', { params: { brandId } }),

  createCategory: (data: { brandId: number; name: string; displayOrder?: number }) =>
    client.post<ApiResponse<ItemCategory>>('/master/categories', data),

  updateCategory: (id: number, data: { brandId: number; name: string; displayOrder?: number }) =>
    client.put<ApiResponse<ItemCategory>>(`/master/categories/${id}`, data),

  deleteCategory: (id: number) =>
    client.delete<ApiResponse<void>>(`/master/categories/${id}`),
};
