"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "judgehub_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Khôi phục phiên đăng nhập từ localStorage khi tải lại trang.
  // TODO: thay bằng gọi API GET /api/auth/me (kèm cookie/token thật) khi nối backend.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setUser(JSON.parse(raw) as AuthUser);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function login(nextUser: AuthUser) {
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));

    // Cookie thường (không phải httpOnly) chỉ chứa role, để middleware.ts
    // đọc được ở tầng edge và chặn route sai quyền trước khi render trang.
    // Token xác thực thật (JWT) nên do BACKEND set dưới dạng httpOnly cookie
    // khi nối API thật — cookie này chỉ phục vụ mục đích điều hướng UI.
    document.cookie = `judgehub_role=${nextUser.role}; path=/; max-age=${60 * 60 * 24 * 7}`;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "judgehub_role=; path=/; max-age=0";
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }
  return ctx;
}
