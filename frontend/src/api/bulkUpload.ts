import client from './client';

export const downloadTemplate = async (type: string) => {
  const { data } = await client.get('/admin/bulk/template', { params: { type }, responseType: 'blob' });
  return data;
};

export const uploadFile = async (file: File, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/admin/bulk/upload', formData, { params: { type }, headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
};

export const confirmBatch = async (batchId: number) => {
  const { data } = await client.post(`/admin/bulk/${batchId}/confirm`);
  return data;
};

export const getUploadHistory = async () => {
  const { data } = await client.get('/admin/bulk/history');
  return data;
};
