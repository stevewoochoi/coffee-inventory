import { create } from 'zustand';
import { authApi, type LoginRequest, type LoginResponse } from '@/api/auth';

interface AuthState {
  user: LoginResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(data);
      const loginData = res.data.data;

      localStorage.setItem('accessToken', loginData.accessToken);
      localStorage.setItem('refreshToken', loginData.refreshToken);

      set({
        user: loginData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const code = err.response?.data?.code;
      const message = code || err.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, error: null });
  },

  initialize: () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (!isExpired) {
          set({
            user: {
              accessToken,
              refreshToken: localStorage.getItem('refreshToken') || '',
              role: payload.role,
              userId: Number(payload.sub),
              email: payload.email,
              storeId: payload.storeId ? Number(payload.storeId) : undefined,
              brandId: payload.brandId ? Number(payload.brandId) : undefined,
              companyId: payload.companyId ? Number(payload.companyId) : undefined,
            },
            isAuthenticated: true,
          });
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  },
}));
