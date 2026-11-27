import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, apiFetch } from '../api/http';

/**
 * Form bắt buộc hiển thị khi tài khoản (vd. đăng nhập Google lần đầu) còn thiếu thông tin.
 * Không có nút đóng: người dùng phải điền đủ hoặc đăng xuất.
 */
export default function CompleteProfileModal() {
  const { t } = useTranslation();
  const { user, refreshProfile, logout } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const missing = user.missingFields ?? { username: false, fullName: false, studentCode: false };
  const missingStudentCode = missing.studentCode;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (missing.username) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) return setError(t('auth.usernameLength'));
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) return setError(t('auth.usernameCharacters'));
    }
    if (missingStudentCode) {
      if (!studentCode.trim()) return setError(t('auth.studentIdRequired'));
      if (!/^\d{8}$/.test(studentCode.trim())) return setError(t('auth.studentIdInvalid'));
    }

    setSaving(true);
    try {
      await apiFetch('/api/v1/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          ...(missing.fullName && trimmedName ? { full_name: trimmedName } : {}),
          ...(missing.username ? { username: trimmedUsername } : {}),
          ...(missingStudentCode ? { student_code: studentCode.trim() } : {}),
        }),
      });
      await refreshProfile();
      showToast(t('completeProfile.success'), 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('completeProfile.failed'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)';
  const labelClass = 'block text-sm font-medium text-(--ws-text) mb-1.5';

  return (
    <div
      className="fixed inset-0 z-1000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('completeProfile.title')}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-(--ws-panel) rounded-2xl border border-(--ws-border) shadow-2xl p-6 space-y-4 animate-slide-up"
      >
        <div>
          <h2 className="text-xl font-bold text-(--ws-text) font-serif">{t('completeProfile.title')}</h2>
          <p className="text-sm text-(--ws-muted) mt-1">{t('completeProfile.subtitle')}</p>
        </div>

        {missing.fullName && (
          <div>
            <label className={labelClass}>{t('auth.fullNameOptional')}</label>
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}

        {missing.username && (
          <div>
            <label className={labelClass}>
              {t('completeProfile.username')} <span className="text-(--ws-danger)">*</span>
            </label>
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        )}

        {missingStudentCode && (
          <div>
            <label className={labelClass}>
              {t('completeProfile.studentId')} <span className="text-(--ws-danger)">*</span>
            </label>
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={8}
              placeholder="20120001"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
            <p className="text-xs text-(--ws-muted) mt-1">{t('completeProfile.studentIdHint')}</p>
          </div>
        )}

        {error && <p className="text-sm text-(--ws-danger)">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={logout} className="text-sm text-(--ws-muted) hover:text-(--ws-text) cursor-pointer">
            {t('completeProfile.logout')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold hover:bg-(--ws-accent-strong) transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving ? t('completeProfile.saving') : t('completeProfile.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}