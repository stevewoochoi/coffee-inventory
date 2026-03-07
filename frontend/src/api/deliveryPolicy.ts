import client from './client';
import type { ApiResponse } from './auth';

export interface DeliveryHoliday {
  id: number;
  brandId: number;
  holidayDate: string;
  description: string | null;
}

export const deliveryPolicyApi = {
  getHolidays: (brandId: number) =>
    client.get<ApiResponse<DeliveryHoliday[]>>('/admin/delivery-holidays', { params: { brandId } }),

  createHoliday: (data: { brandId: number; holidayDate: string; description?: string }) =>
    client.post<ApiResponse<DeliveryHoliday>>('/admin/delivery-holidays', data),

  deleteHoliday: (id: number) =>
    client.delete<ApiResponse<void>>(`/admin/delivery-holidays/${id}`),
};
