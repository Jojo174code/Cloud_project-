import React, { createContext, useContext, useEffect, useState } from 'react';
import Router from 'next/router';
import { api } from '@/lib/api';

type User = {
  id: string;
  full_name: string;
  role: 'TENANT' | 'MANAGER';
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const syncUser = async (jwt: string) => {
    try {
      // optional /api/auth/me endpoint could be added later; for now decode token payload minimally
      const base = jwt.split('.')[1];
      const payload = JSON.parse(atob(base));
      setUser({ id: payload.userId, full_name: payload.fullName || 'User', role: payload.role || 'TENANT' } as any);
    } catch {
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { token: jwt } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('token', jwt);
    setToken(jwt);
    await syncUser(jwt);
    // redirect based on role – naive check
    if (user?.role === 'MANAGER') Router.replace('/manager/dashboard');
    else Router.replace('/tenant/dashboard');
  };

  const register = async (data: any) => {
    await api('/api/auth/register', { method: 'POST', body: data });
    Router.replace('/login');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    Router.replace('/login');
  };

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      syncUser(stored);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
