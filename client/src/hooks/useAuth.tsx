"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type User = {
  id: string;
  full_name: string;
  role: "TENANT" | "MANAGER";
};

type AuthResponse = {
  token: string;
  user: User;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    role: User["role"];
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDashboardRoute = (role: User["role"]) => {
  return role === "MANAGER" ? "/manager/dashboard" : "/tenant/dashboard";
};

const parseStoredUser = (raw: string | null): User | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const persistAuth = ({ token: authToken, user: authUser }: AuthResponse) => {
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const login = async (email: string, password: string) => {
    const auth = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    const authUser = persistAuth(auth);
    router.replace(getDashboardRoute(authUser.role));
  };

  const register = async (data: {
    full_name: string;
    email: string;
    password: string;
    role: User["role"];
  }) => {
    const auth = await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: data,
    });

    const authUser = persistAuth(auth);
    router.replace(getDashboardRoute(authUser.role));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);

    router.replace("/login");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = parseStoredUser(localStorage.getItem("user"));

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      return;
    }

    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
