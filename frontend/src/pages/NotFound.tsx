import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-(--ws-panel2) flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-3xl border border-(--ws-border) bg-(--ws-panel) p-8 shadow-sm text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-(--ws-muted)">404</p>
        <h1 className="mt-3 text-3xl font-bold font-serif text-(--ws-text)">{t('notFound.title')}</h1>
        <p className="mt-3 text-sm text-(--ws-text)">
          {t('notFound.description')}
        </p>
        <Link
          to="/student/dashboard"
          className="inline-flex mt-6 items-center justify-center rounded-xl bg-(--ws-accent) px-5 py-2.5 text-sm font-medium text-(--ws-on-accent) shadow-md hover:bg-(--ws-accent-strong)"
        >
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  );
}
