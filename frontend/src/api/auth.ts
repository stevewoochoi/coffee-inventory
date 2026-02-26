import client from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: number;
  email: string;
  storeId?: number;
  brandId?: number;
  companyId?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  name: string;
  accountStatus: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<ApiResponse<LoginResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<ApiResponse<RegisterResponse>>('/auth/register', data),

  checkEmail: (email: string) =>
    client.get<ApiResponse<{ available: boolean }>>('/auth/check-email', { params: { email } }),

  refresh: (refreshToken: string) =>
    client.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),
};
