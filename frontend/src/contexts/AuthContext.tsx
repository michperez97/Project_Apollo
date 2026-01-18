import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthResponse, User } from '../types';
import * as authApi from '../services/auth';
import { setAuthToken } from '../services/http';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'apollo_token';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setAuthToken(stored);
      setToken(stored);
      authApi
        .fetchProfile()
        .then((profile) => setUser(profile))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setAuthToken(undefined);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (data: AuthResponse) => {
    setUser(data.user);
    setToken(data.token);
    setAuthToken(data.token);
    localStorage.setItem(TOKEN_KEY, data.token);
  };

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    handleAuthSuccess(data);
  };

  const register = async (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => {
    const data = await authApi.register(payload);
    handleAuthSuccess(data);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(undefined);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};


