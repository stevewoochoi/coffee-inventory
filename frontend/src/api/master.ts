import client from './client';
import type { ApiResponse } from './auth';

// Item types
export interface Item {
  id: number;
  brandId: number;
  name: string;
  category: string | null;
  baseUnit: string;
  lossRate: number;
  price: number | null;
  vatInclusive: boolean;
  supplierId: number | null;
  supplierName: string | null;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
}

export interface ItemRequest {
  brandId: number;
  name: string;
  category?: string;
  baseUnit: string;
  lossRate?: number;
  price?: number;
  vatInclusive?: boolean;
  supplierId?: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// Packaging types
export interface SupplierItemInfo {
  supplierItemId: number;
  supplierId: number;
  supplierName: string;
  price: number | null;
  supplierSku: string | null;
  leadTimeDays: number;
}

export interface Packaging {
  id: number;
  itemId: number;
  packName: string;
  unitsPerPack: number;
  packBarcode: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  itemName: string;
  baseUnit: string;
  categoryName: string | null;
  categoryId: number | null;
  supplierItems: SupplierItemInfo[];
  itemPrice: number | null;
  vatInclusive: boolean | null;
}

export interface PackagingRequest {
  itemId: number;
  packName: string;
  unitsPerPack: number;
  packBarcode?: string;
  boxPrice?: number;
  supplierId?: number;
}

// Supplier types
export interface Supplier {
  id: number;
  brandId: number;
  name: string;
  email: string | null;
  orderMethod: string;
  createdAt: string;
}

export interface SupplierRequest {
  brandId: number;
  name: string;
  email?: string;
  orderMethod?: string;
}

export interface SupplierItem {
  id: number;
  supplierId: number;
  packagingId: number;
  supplierSku: string | null;
  leadTimeDays: number;
  price: number | null;
}

export interface SupplierItemRequest {
  supplierId: number;
  packagingId: number;
  supplierSku?: string;
  leadTimeDays?: number;
  price?: number;
}

export const masterApi = {
  // Items
  getItems: (brandId?: number, page = 0, size = 20) =>
    client.get<ApiResponse<Page<Item>>>('/master/items', {
      params: { brandId, page, size },
    }),
  getItem: (id: number) =>
    client.get<ApiResponse<Item>>(`/master/items/${id}`),
  createItem: (data: ItemRequest) =>
    client.post<ApiResponse<Item>>('/master/items', data),
  updateItem: (id: number, data: ItemRequest) =>
    client.put<ApiResponse<Item>>(`/master/items/${id}`, data),
  updateItemImage: (id: number, imageUrl: string) =>
    client.post<ApiResponse<Item>>(`/master/items/${id}/image`, { imageUrl }),
  deleteItem: (id: number) =>
    client.delete<ApiResponse<void>>(`/master/items/${id}`),

  // Packagings
  getPackagings: (itemId: number) =>
    client.get<ApiResponse<Packaging[]>>('/master/packagings', {
      params: { itemId },
    }),
  getAllPackagings: (brandId?: number, status?: string) =>
    client.get<ApiResponse<Packaging[]>>('/master/packagings/all', {
      params: { brandId, status },
    }),
  createPackaging: (data: PackagingRequest) =>
    client.post<ApiResponse<Packaging>>('/master/packagings', data),
  updatePackaging: (id: number, data: PackagingRequest) =>
    client.put<ApiResponse<Packaging>>(`/master/packagings/${id}`, data),
  updatePackagingImage: (id: number, imageUrl: string) =>
    client.post<ApiResponse<Packaging>>(`/master/packagings/${id}/image`, { imageUrl }),
  deprecatePackaging: (id: number) =>
    client.delete<ApiResponse<void>>(`/master/packagings/${id}`),

  // Suppliers
  getSuppliers: (brandId?: number) =>
    client.get<ApiResponse<Supplier[]>>('/master/suppliers', {
      params: { brandId },
    }),
  createSupplier: (data: SupplierRequest) =>
    client.post<ApiResponse<Supplier>>('/master/suppliers', data),
  updateSupplier: (id: number, data: SupplierRequest) =>
    client.put<ApiResponse<Supplier>>(`/master/suppliers/${id}`, data),
  deleteSupplier: (id: number) =>
    client.delete<ApiResponse<void>>(`/master/suppliers/${id}`),

  // SupplierItems
  getSupplierItems: (supplierId: number) =>
    client.get<ApiResponse<SupplierItem[]>>(`/master/suppliers/${supplierId}/items`),
  createSupplierItem: (supplierId: number, data: SupplierItemRequest) =>
    client.post<ApiResponse<SupplierItem>>(`/master/suppliers/${supplierId}/items`, data),
  deleteSupplierItem: (supplierId: number, itemId: number) =>
    client.delete<ApiResponse<void>>(`/master/suppliers/${supplierId}/items/${itemId}`),
};
