import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'student' | 'instructor';
}

/**
 * Bảo vệ route theo role.
 * - Nếu chưa đăng nhập → redirect về /login
 * - Nếu sai role → redirect về dashboard của role tương ứng
 */
export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isInitializing } = useAuth();

  // Đang khởi tạo (hydrate token) → không làm gì
  if (isInitializing) return null;

  // Chưa đăng nhập → về trang login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Sai role → redirect về đúng dashboard của role hiện tại
  if (user.role !== allowedRole) {
    const fallback = user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
