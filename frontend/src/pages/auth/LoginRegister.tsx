import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './forgot-password-modal';
import { ForgotPasswordCodeModal } from './forgot-password-code-modal';
import { ForgotPasswordNewPasswordModal } from './forgot-password-new-password-modal';
import { LoginModal } from './login-modal';
import { RegisterModal } from './register-modal';

type AuthView = 'login' | 'register' | 'forgot-email' | 'forgot-code' | 'forgot-password';

export default function LoginRegister() {
  const [view, setView] = useState<AuthView>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard', {
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, user]);

  const closeAuth = () => navigate('/', { replace: true });
  const goToLogin = () => {
    setResetEmail('');
    setResetCode('');
    setResetToken('');
    setView('login');
  };

  if (view === 'register') {
    return <RegisterModal onClose={closeAuth} onSwitchToLogin={goToLogin} />;
  }

  if (view === 'forgot-email') {
    return (
      <ForgotPasswordModal
        onClose={closeAuth}
        onSwitchToLogin={goToLogin}
        onCodeSent={(email) => {
          setResetEmail(email);
          setView('forgot-code');
        }}
      />
    );
  }

  if (view === 'forgot-code') {
    return (
      <ForgotPasswordCodeModal
        email={resetEmail}
        onClose={closeAuth}
        onSwitchToLogin={goToLogin}
        onBack={() => setView('forgot-email')}
        onVerified={(code, token) => {
          setResetCode(code);
          setResetToken(token ?? '');
          setView('forgot-password');
        }}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <ForgotPasswordNewPasswordModal
        email={resetEmail}
        code={resetCode}
        token={resetToken}
        onClose={closeAuth}
        onSuccess={goToLogin}
      />
    );
  }

  return (
    <LoginModal
      onClose={closeAuth}
      onSwitchToRegister={() => setView('register')}
      onSwitchToForgotPassword={() => setView('forgot-email')}
    />
  );
}
