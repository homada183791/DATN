import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiError, apiFetch } from '../api/http';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  role: 'student' | 'instructor';
  institution: string;
  solvedCount: number;
  submissionCount: number;
  rating: number;
  joinDate: string;
  bio: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  loginWithGoogle: (accessToken: string) => Promise<{ ok: boolean; message?: string }>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<{ ok: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ ok: boolean; message?: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ ok: boolean; token?: string; message?: string }>;
  resetPassword: (email: string, code: string, token: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: BackendRole;
  };
}

type BackendRole = 'STUDENT' | 'INSTRUCTOR';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACCESS_TOKEN_KEY = 'accessToken';

const baseUserFields = {
  avatar: '',
  institution: 'JudgeHub Academy',
  solvedCount: 0,
  submissionCount: 0,
  rating: 0,
  joinDate: new Date().toISOString().slice(0, 10),
  bio: '',
};

function normalizeRole(role: BackendRole): User['role'] {
  return role === 'INSTRUCTOR' ? 'instructor' : 'student';
}

function normalizeUser(identifier: string, role: User['role'], fullName?: string, id?: string): User {
  const username = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  return {
    id: id ?? `${role}-${username}`,
    username,
    email: identifier,
    fullName: fullName ?? username,
    role,
    ...baseUserFields,
  };
}

async function hydrateProfile(token: string) {
  const profile = await apiFetch<{ id: string; email: string; role: BackendRole }>('/api/v1/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return normalizeUser(profile.email, normalizeRole(profile.role), undefined, profile.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setIsInitializing(false);
      return;
    }

    hydrateProfile(token)
      .then((profile) => setUser(profile))
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const login = async (identifier: string, password: string) => {
    const email = identifier.trim().toLowerCase();

    try {
      const response = await apiFetch<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      window.localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      setUser(normalizeUser(response.user.email, normalizeRole(response.user.role), undefined, response.user.id));
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          ok: false,
          message: error.status === 401 ? 'Sai tài khoản hoặc mật khẩu.' : error.message,
        };
      }
      return { ok: false, message: 'Không thể đăng nhập lúc này.' };
    }
  };

  const loginWithGoogle = async (accessToken: string) => {
    try {
      const response = await apiFetch<AuthResponse>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ accessToken }),
      });
      window.localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      setUser(normalizeUser(response.user.email, normalizeRole(response.user.role), undefined, response.user.id));
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: 'Không thể đăng nhập bằng Google lúc này.' };
    }
  };

  const register = async (_username: string, email: string, password: string, _fullName: string) => {
    try {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return { ok: false, message: 'Email đã tồn tại.' };
      }
      return { ok: false, message: error instanceof ApiError ? error.message : 'Vui lòng nhập đầy đủ thông tin bắt buộc.' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await apiFetch<{ message?: string; code?: string }>('api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return { ok: true, message: response.message ?? 'Mã xác nhận đã được gửi tới email của bạn.' };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: 'Không thể gửi mã xác nhận lúc này.' };
    }
  };

  const verifyResetCode = async (email: string, code: string) => {
    try {
      const response = await apiFetch<{ verified: boolean; token: string }>('/api/v1/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      return { ok: true, token: response.token };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: 'Mã xác nhận không đúng hoặc đã hết hạn.' };
    }
  };

  const resetPassword = async (email: string, code: string, token: string, password: string) => {
    try {
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, token, password }),
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: 'Không thể đặt lại mật khẩu lúc này.' };
    }
  };

  const logout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    import('../api/queryClient').then(({ queryClient }) => {
      queryClient.clear();
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, forgotPassword, verifyResetCode, resetPassword, logout, isAuthenticated: !!user, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
