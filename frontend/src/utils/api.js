import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Crucial for sending/receiving HTTP-Only cookies
});

let accessToken = null;
let refreshSubscribers = [];
let isRefreshing = false;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

// Helper to queue requests while refreshing
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

// Run all queued requests once refreshed
const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized errors and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    if (response && response.status === 401 && !originalRequest._retry) {
      // If refresh route fails, don't loop
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/logout')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        setAccessToken(newAccessToken);

        // Update the AuthContext state via window hooks if registered
        if (window.__updateAccessToken) {
          window.__updateAccessToken(newAccessToken);
        }

        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        setAccessToken(null);

        // Trigger global logout redirect in AuthContext if registered
        if (window.__triggerLogout) {
          window.__triggerLogout();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
