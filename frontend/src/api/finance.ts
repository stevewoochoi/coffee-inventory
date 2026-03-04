import client from './client';

export const getPurchaseSummary = async (brandId: number, year: number, month: number) => {
  const { data } = await client.get('/finance/purchase-summary', { params: { brandId, year, month } });
  return data;
};

export const getInventoryValuation = async (brandId: number) => {
  const { data } = await client.get('/finance/inventory-valuation', { params: { brandId } });
  return data;
};

export const getMonthlyReport = async (brandId: number, year: number, month: number) => {
  const { data } = await client.get('/finance/monthly-report', { params: { brandId, year, month } });
  return data;
};

export const executeMonthlyClosing = async (brandId: number, year: number, month: number) => {
  const { data } = await client.post('/finance/monthly-closing', { brandId, year, month });
  return data;
};

export const getClosingHistory = async (brandId: number) => {
  const { data } = await client.get('/finance/closing-history', { params: { brandId } });
  return data;
};
