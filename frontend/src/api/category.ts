import client from './client';
import type { ApiResponse } from './auth';

export interface ItemCategory {
  id: number;
  brandId: number;
  parentId: number | null;
  level: number;
  name: string;
  code: string | null;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  level: number;
  code: string | null;
  icon: string | null;
  displayOrder: number;
  children: CategoryTreeNode[];
}

export interface CategoryRequest {
  brandId: number;
  name: string;
  parentId?: number | null;
  code?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export const categoryApi = {
  getCategories: (brandId: number, level?: number, parentId?: number) =>
    client.get<ApiResponse<ItemCategory[]>>('/master/categories', {
      params: { brandId, level, parentId },
    }),

  getCategoryTree: (brandId: number) =>
    client.get<ApiResponse<CategoryTreeNode[]>>('/master/categories/tree', {
      params: { brandId },
    }),

  getAllCategories: (brandId: number) =>
    client.get<ApiResponse<ItemCategory[]>>('/master/categories/all', { params: { brandId } }),

  createCategory: (data: CategoryRequest) =>
    client.post<ApiResponse<ItemCategory>>('/master/categories', data),

  updateCategory: (id: number, data: CategoryRequest) =>
    client.put<ApiResponse<ItemCategory>>(`/master/categories/${id}`, data),

  deleteCategory: (id: number) =>
    client.delete<ApiResponse<void>>(`/master/categories/${id}`),
};
