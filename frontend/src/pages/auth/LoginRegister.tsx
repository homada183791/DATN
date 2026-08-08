import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './forgot-password-modal';
import { LoginModal } from './login-modal';
import { RegisterModal } from './register-modal';

type AuthView = 'login' | 'register' | 'forgot';

export default function LoginRegister() {
  const [view, setView] = useState<AuthView>('login');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard', {
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, user]);

  if (view === 'register') {
    return (
      <RegisterModal
        onClose={() => navigate('/', { replace: true })}
        onSwitchToLogin={() => setView('login')}
      />
    );
  }

  if (view === 'forgot') {
    return (
      <ForgotPasswordModal
        onClose={() => navigate('/', { replace: true })}
        onSwitchToLogin={() => setView('login')}
      />
    );
  }

  return (
    <LoginModal
      onClose={() => navigate('/', { replace: true })}
      onSwitchToRegister={() => setView('register')}
      onSwitchToForgotPassword={() => setView('forgot')}
    />
  );
}
