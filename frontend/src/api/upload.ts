import client from './client';
import type { ApiResponse } from './auth';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export const uploadApi = {
  getPresignedUrl: (fileName: string, contentType = 'image/jpeg') =>
    client.get<ApiResponse<PresignedUrlResponse>>('/upload/presigned-url', { params: { fileName, contentType } }),
};
