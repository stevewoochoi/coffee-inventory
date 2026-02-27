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

// Order Needs types
export interface PackagingOption {
  packagingId: number;
  packName: string;
  unitsPerPack: number;
  price: number;
  leadTimeDays: number;
  suggestedPackQty: number;
}

export interface SupplierOption {
  supplierId: number;
  supplierName: string;
  packagings: PackagingOption[];
}

export interface NeedsItem {
  itemId: number;
  itemName: string;
  category: string;
  baseUnit: string;
  currentStock: number;
  minStock: number;
  avgDailyUsage: number;
  daysUntilEmpty: number;
  suggestedQty: number;
  suppliers: SupplierOption[];
}

export interface OrderNeedsResponse {
  storeId: number;
  urgent: NeedsItem[];
  recommended: NeedsItem[];
  predicted: NeedsItem[];
}

// Cart types
export interface CartItemResponse {
  id: number;
  packagingId: number;
  packName: string;
  itemId: number;
  itemName: string | null;
  unitsPerPack: number;
  packQty: number;
  price: number;
  lineTotal: number;
}

export interface CartSupplierGroup {
  supplierId: number;
  supplierName: string;
  items: CartItemResponse[];
  subtotal: number;
}

export interface CartResponse {
  cartId: number | null;
  storeId: number;
  supplierGroups: CartSupplierGroup[];
  grandTotal: number;
  totalItems: number;
}

export interface ConfirmResponse {
  orderPlanIds: number[];
  orderCount: number;
}

// Delivery dates types
export interface AvailableDate {
  date: string;
  dayOfWeek: string;
  isRecommended: boolean;
  orderDeadline: string;
}

export interface AvailableDateResponse {
  availableDates: AvailableDate[];
  storeDeliveryType: string;
  cutoffTime: string;
  maxDisplayDays: number;
}

export interface OrderAvailability {
  available: boolean;
  deadline: string;
  remainingMinutes: number;
}

// Catalog types
export interface CatalogPackaging {
  packagingId: number;
  label: string;
  unitsPerPack: number;
  unitPrice: number;
  supplierId: number;
  supplierName: string;
  maxOrderQty: number;
}

export interface CatalogItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  temperatureZone: string;
  currentStock: number;
  unit: string;
  minStock: number;
  isLowStock: boolean;
  packagings: CatalogPackaging[];
  lastOrder: { date: string; quantity: number } | null;
  suggestedQty: number;
  suggestedByAi: boolean;
  daysUntilEmpty: number | null;
}

export interface CatalogResponse {
  content: CatalogItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CategoryNode {
  id: number;
  name: string;
  displayOrder: number;
}

// History types
export interface HistoryLine {
  packagingId: number;
  packName: string;
  itemId: number;
  itemName: string;
  packQty: number;
  unitsPerPack: number;
  price: number;
}

export interface OrderHistory {
  id: number;
  storeId: number;
  supplierId: number;
  supplierName: string;
  status: string;
  lines: HistoryLine[];
  createdAt: string;
}

// Detailed response with timestamps
export interface OrderDetailedResponse {
  id: number;
  storeId: number;
  supplierId: number;
  supplierName: string;
  status: string;
  fulfillmentStatus: string | null;
  deliveryDate: string | null;
  cutoffAt: string | null;
  totalAmount: number | null;
  vatAmount: number | null;
  recommendedByAi: boolean;
  lines: HistoryLine[];
  createdAt: string;
  confirmedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
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

  getOrderNeeds: (storeId: number, brandId?: number) =>
    client.get<ApiResponse<OrderNeedsResponse>>('/ordering/needs', {
      params: { storeId, brandId },
    }),

  // Cart API
  getCart: (storeId: number, userId: number) =>
    client.get<ApiResponse<CartResponse>>('/ordering/cart', { params: { storeId, userId } }),

  addToCart: (storeId: number, userId: number, data: { packagingId: number; supplierId: number; packQty: number }) =>
    client.post<ApiResponse<CartResponse>>('/ordering/cart/items', data, { params: { storeId, userId } }),

  updateCartItem: (storeId: number, userId: number, itemId: number, data: { packQty: number }) =>
    client.put<ApiResponse<CartResponse>>(`/ordering/cart/items/${itemId}`, data, { params: { storeId, userId } }),

  removeCartItem: (storeId: number, userId: number, itemId: number) =>
    client.delete<ApiResponse<CartResponse>>(`/ordering/cart/items/${itemId}`, { params: { storeId, userId } }),

  clearCart: (storeId: number, userId: number) =>
    client.delete<ApiResponse<CartResponse>>('/ordering/cart', { params: { storeId, userId } }),

  confirmCart: (storeId: number, userId: number) =>
    client.post<ApiResponse<ConfirmResponse>>('/ordering/cart/confirm', null, { params: { storeId, userId } }),

  // History & Reorder
  getOrderHistory: (storeId: number, limit = 10) =>
    client.get<ApiResponse<OrderHistory[]>>('/ordering/history', { params: { storeId, limit } }),

  reorder: (orderId: number, storeId: number) =>
    client.post<ApiResponse<CartResponse>>(`/ordering/reorder/${orderId}`, null, { params: { storeId } }),

  // Detailed plan
  getPlanDetail: (id: number) =>
    client.get<ApiResponse<OrderDetailedResponse>>(`/ordering/plans/${id}/detail`),

  // Delivery dates
  getDeliveryDates: (storeId: number) =>
    client.get<ApiResponse<AvailableDateResponse>>('/ordering/delivery-dates', { params: { storeId } }),

  getAvailability: (storeId: number, deliveryDate: string) =>
    client.get<ApiResponse<OrderAvailability>>('/ordering/availability', { params: { storeId, deliveryDate } }),

  // Catalog
  getCatalog: (params: {
    storeId: number;
    deliveryDate: string;
    categoryId?: number;
    keyword?: string;
    lowStockOnly?: boolean;
    page?: number;
    size?: number;
  }) =>
    client.get<ApiResponse<CatalogResponse>>('/ordering/catalog', { params }),

  getOrderingCategories: (brandId: number) =>
    client.get<ApiResponse<CategoryNode[]>>('/ordering/categories', { params: { brandId } }),

  // Enhanced cart with delivery date
  createCartWithDate: (data: {
    storeId: number;
    deliveryDate: string;
    items: Array<{ itemId: number; packagingId: number; quantity: number }>;
  }) =>
    client.post<ApiResponse<CartResponse>>('/ordering/cart', data),

  confirmCartById: (cartId: number) =>
    client.post<ApiResponse<ConfirmResponse>>(`/ordering/cart/${cartId}/confirm`),

  // Order management
  cancelPlan: (id: number) =>
    client.post<ApiResponse<OrderPlan>>(`/ordering/plans/${id}/cancel`),

  updatePlan: (id: number, data: { lines: OrderLineDto[] }) =>
    client.put<ApiResponse<OrderPlan>>(`/ordering/plans/${id}`, data),
};
