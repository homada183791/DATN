import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const homePath = !isAuthenticated
    ? '/login'
    : user?.role === 'instructor'
      ? '/instructor/dashboard'
      : '/student/dashboard';

  return (
    <main className="min-h-screen bg-(--ws-bg) flex items-center justify-center px-6 text-(--ws-text)">
      <div className="max-w-lg w-full rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-8 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-(--ws-accent-soft) text-(--ws-accent) flex items-center justify-center mb-4">
          <Compass size={24} aria-hidden="true" />
        </div>
        <p className="text-xs font-bold font-mono uppercase tracking-[0.25em] text-(--ws-muted)">404</p>
        <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold font-serif text-(--ws-text)">{t('notFound.title')}</h1>
        <p className="mt-3 text-sm text-(--ws-muted) leading-relaxed max-w-md mx-auto">
          {t('notFound.description')}
        </p>
        <Link
          to={homePath}
          className="inline-flex mt-6 items-center justify-center gap-2 min-h-11 rounded-xl bg-(--ws-accent) px-5 py-2.5 text-sm font-semibold text-(--ws-on-accent) shadow-xs hover:bg-(--ws-accent-strong) transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('notFound.home')}</span>
        </Link>
      </div>
    </main>
  );
}
