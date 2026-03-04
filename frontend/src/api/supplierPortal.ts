import client from './client';

export const getSupplierOrders = async (supplierId: number, status?: string) => {
  const { data } = await client.get('/supplier-portal/orders', { params: { supplierId, status } });
  return data;
};

export const notifySupplier = async (orderPlanId: number, supplierId: number, notificationType: string, message: string) => {
  const { data } = await client.post(`/supplier-portal/orders/${orderPlanId}/notify`, { notificationType, message }, { params: { supplierId } });
  return data;
};

export const getNotifications = async (orderPlanId: number) => {
  const { data } = await client.get(`/supplier-portal/orders/${orderPlanId}/notifications`);
  return data;
};
