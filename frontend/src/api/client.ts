import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Check if token is expired
function isTokenExpired(): boolean {
  const token = localStorage.getItem('accessToken');
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Force logout and redirect
function forceLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Only redirect if not already on login page
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login?expired=1';
  }
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    // Check expiry before sending request
    if (isTokenExpired()) {
      forceLogout();
      return Promise.reject(new axios.Cancel('Token expired'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch {
          forceLogout();
        }
      } else {
        forceLogout();
      }
    }

    // 403 with expired token should also logout
    if (error.response?.status === 403 && isTokenExpired()) {
      forceLogout();
    }

    return Promise.reject(error);
  }
);

export default client;
