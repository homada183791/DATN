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
  register: (username: string, email: string, password: string, fullName: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: 'student' | 'instructor') => void;
  isAuthenticated: boolean;
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

const demoUsers: Record<string, { password: string; user: User }> = {
  'nguyenvana@university.edu.vn': {
    password: '123456',
    user: {
      id: 'demo-student',
      username: 'nguyenvana',
      email: 'nguyenvana@university.edu.vn',
      fullName: 'Nguyễn Văn A',
      role: 'student',
      ...baseUserFields,
      solvedCount: 156,
      submissionCount: 489,
      rating: 1847,
      bio: 'Sinh viên năm 3, chuyên ngành Khoa học Máy tính.',
    },
  },
  'tranducb@university.edu.vn': {
    password: '123456',
    user: {
      id: 'demo-instructor',
      username: 'tranducb',
      email: 'tranducb@university.edu.vn',
      fullName: 'Trần Đức B',
      role: 'instructor',
      ...baseUserFields,
      solvedCount: 842,
      submissionCount: 2100,
      rating: 2450,
      bio: 'Giảng viên khoa Công nghệ Thông tin.',
    },
  },
};

function normalizeRole(role: BackendRole): User['role'] {
  return role === 'INSTRUCTOR' ? 'instructor' : 'student';
}

function normalizeUser(identifier: string, role: User['role'], fullName?: string): User {
  const username = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  return {
    id: `${role}-${username}`,
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

  return normalizeUser(profile.email, normalizeRole(profile.role));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    hydrateProfile(token)
      .then((profile) => setUser(profile))
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
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
      setUser(normalizeUser(response.user.email, normalizeRole(response.user.role)));
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        const demo = demoUsers[email];
        if (demo && demo.password === password) {
          setUser({ ...demo.user });
          window.localStorage.setItem(ACCESS_TOKEN_KEY, `demo-${demo.user.id}`);
          return { ok: true };
        }
        return {
          ok: false,
          message: error.status === 401 ? 'Sai tài khoản hoặc mật khẩu.' : error.message,
        };
      }
      return { ok: false, message: 'Không thể đăng nhập lúc này.' };
    }
  };

  const register = async (_username: string, email: string, password: string, fullName: string) => {
    try {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setUser(normalizeUser(email.trim().toLowerCase(), 'student', fullName));
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return { ok: false, message: 'Email đã tồn tại.' };
      }
      if (email.trim() && fullName.trim()) {
        setUser(normalizeUser(email.trim().toLowerCase(), 'student', fullName));
        return { ok: true };
      }
      return { ok: false, message: error instanceof ApiError ? error.message : 'Vui lòng nhập đầy đủ thông tin bắt buộc.' };
    }
  };

  const logout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
  };

  const switchRole = (role: 'student' | 'instructor') => {
    const fallback = role === 'student' ? demoUsers['nguyenvana@university.edu.vn'].user : demoUsers['tranducb@university.edu.vn'].user;
    setUser({ ...fallback, role });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, switchRole, isAuthenticated: !!user }}>
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
