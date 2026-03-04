import client from './client';

export const executeCutoff = async (deliveryDate: string) => {
  const { data } = await client.post('/admin/ordering/cutoff', { deliveryDate });
  return data;
};

export const checkShortage = async (deliveryDate: string, brandId: number) => {
  const { data } = await client.get('/admin/ordering/shortage-check', { params: { deliveryDate, brandId } });
  return data;
};

export const adjustOrderLine = async (planId: number, lineId: number, adjustedQty: number, reason: string) => {
  const { data } = await client.put(`/admin/ordering/plans/${planId}/lines/${lineId}/adjust`, { adjustedQty, reason });
  return data;
};

export const dispatchAll = async (deliveryDate: string) => {
  const { data } = await client.post('/admin/ordering/dispatch-all', { deliveryDate });
  return data;
};
