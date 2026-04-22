"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type User = {
  id: string;
  full_name: string;
  role: "TENANT" | "MANAGER";
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const syncUser = async (jwt: string) => {
    try {
      const base = jwt.split(".")[1];
      const payload = JSON.parse(atob(base));

      const parsedUser: User = {
        id: payload.userId,
        full_name: payload.fullName || "User",
        role: payload.role || "TENANT",
      };

      setUser(parsedUser);
      return parsedUser;
    } catch {
      setUser(null);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    const { token: jwt } = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    localStorage.setItem("token", jwt);
    setToken(jwt);

    const parsedUser = await syncUser(jwt);

    // ✅ Use parsedUser instead of stale state
    if (parsedUser?.role === "MANAGER") {
      router.replace("/manager/dashboard");
    } else {
      router.replace("/tenant/dashboard");
    }
  };

  const register = async (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => {
    await api("/api/auth/register", {
      method: "POST",
      body: data,
    });

    router.replace("/login");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);

    router.replace("/login");
  };

  useEffect(() => {
    const stored = localStorage.getItem("token");

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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
