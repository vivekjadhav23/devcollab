import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAccessToken } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Clear auth states in-memory
  const handleLocalLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAccessToken(null);
    setLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      handleLocalLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLocalLogout]);

  // Handle active login redirect
  const login = useCallback(async (accessToken) => {
    setToken(accessToken);
    setAccessToken(accessToken);
    setLoading(true);
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user on login:', error);
      handleLocalLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLocalLogout]);

  // Server logout + local state clear
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLocalLogout();
    }
  }, [handleLocalLogout]);

  // Trigger silent refresh API call
  const silentRefresh = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { accessToken } = response.data;
      setToken(accessToken);
      setAccessToken(accessToken);
      return accessToken;
    } catch (error) {
      handleLocalLogout();
      return null;
    }
  }, [handleLocalLogout]);

  // Initial check on page load / boot
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (window.location.pathname === '/auth/success') {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      const refreshedToken = await silentRefresh();
      if (refreshedToken) {
        await fetchUserProfile();
      } else {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [silentRefresh, fetchUserProfile]);

  // Schedule background token rotation every 13 minutes
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(async () => {
      await silentRefresh();
    }, 13 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [token, silentRefresh]);

  // Connect Axios interceptors to AuthContext updates
  useEffect(() => {
    window.__updateAccessToken = (newToken) => {
      setToken(newToken);
      setAccessToken(newToken);
    };
    window.__triggerLogout = () => {
      handleLocalLogout();
    };

    return () => {
      delete window.__updateAccessToken;
      delete window.__triggerLogout;
    };
  }, [handleLocalLogout]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refresh: silentRefresh
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
