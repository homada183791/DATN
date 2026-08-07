import { createContext, useContext, useState, ReactNode } from 'react';
import { User, currentUser, instructorUser, mockAuthAccounts } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => boolean;
  register: (username: string, email: string, password: string, fullName: string) => boolean;
  logout: () => void;
  switchRole: (role: 'student' | 'instructor') => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (identifier: string, password: string) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const matchedAccount = mockAuthAccounts.find(
      (account) =>
        (account.username.toLowerCase() === normalizedIdentifier ||
          account.email.toLowerCase() === normalizedIdentifier) &&
        account.password === password
    );

    if (!matchedAccount) {
      return false;
    }

    setUser({ ...matchedAccount.user });
    return true;
  };

  const register = (username: string, email: string, _password: string, fullName: string) => {
    if (username.trim() && email.trim() && fullName.trim()) {
      setUser({ ...currentUser, username, email, fullName, role: 'student' });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: 'student' | 'instructor') => {
    if (role === 'student') {
      setUser({ ...currentUser });
    } else {
      setUser({ ...instructorUser });
    }
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
