import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthResponse, UserRole } from '@smart-parking/shared';
import {
  apiClient,
  AUTH_TOKEN_EVENT,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../services/api';
import { getMeApi, logoutApi } from '../services/authService';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    getStoredAccessToken()
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set request authorization header whenever accessToken changes
  useEffect(() => {
    if (accessToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      localStorage.setItem('accessToken', accessToken);
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  useEffect(() => {
    const handleTokenChange = (event: Event) => {
      setAccessToken((event as CustomEvent<string | null>).detail);
    };
    window.addEventListener(AUTH_TOKEN_EVENT, handleTokenChange);
    return () => window.removeEventListener(AUTH_TOKEN_EVENT, handleTokenChange);
  }, []);

  // Check auth session on initial app load
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        try {
          const res = await getMeApi();
          setUser(res.user);
        } catch {
          setAccessToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [accessToken]);

  const login = (authData: AuthResponse) => {
    setStoredAccessToken(authData.accessToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.accessToken}`;
    setUser(authData.user);
    setAccessToken(authData.accessToken);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      setStoredAccessToken(null);
      setUser(null);
      setAccessToken(null);
    }
  };

  const updateUser = (updatedUser: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...updatedUser });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
