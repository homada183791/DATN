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
    'w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]';
  const labelClass = 'block text-sm font-medium text-[#5c5446] mb-1.5';

  return (
    <div className="fixed inset-0 z-1000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl border border-[#e5dac9] shadow-2xl p-6 space-y-4"
      >
        <div>
          <h2 className="text-xl font-bold text-[#191919] font-serif">{t('completeProfile.title')}</h2>
          <p className="text-sm text-[#8a8073] mt-1">{t('completeProfile.subtitle')}</p>
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
              {t('completeProfile.username')} <span className="text-[#cc5a37]">*</span>
            </label>
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        )}

        {missingStudentCode && (
          <div>
            <label className={labelClass}>
              {t('completeProfile.studentId')} <span className="text-[#cc5a37]">*</span>
            </label>
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={8}
              placeholder="20120001"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
            <p className="text-xs text-[#8a8073] mt-1">{t('completeProfile.studentIdHint')}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={logout} className="text-sm text-[#8a8073] hover:text-[#191919] cursor-pointer">
            {t('completeProfile.logout')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#193a2b] text-white text-sm font-semibold hover:bg-[#244d39] disabled:opacity-60 cursor-pointer"
          >
            {saving ? t('completeProfile.saving') : t('completeProfile.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}