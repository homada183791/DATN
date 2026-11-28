import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch, ApiError } from '../../api/http';
import { saveAndBroadcastEditorPreferences } from '../../utils/editorPreferences';
import {
  User as UserIcon,
  Lock,
  Bell,
  Palette,
  Shield,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const { i18n, t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    studentCode: user?.studentCode || '',
    bio: user?.bio || '',
    institution: user?.institution || '',
    avatarUrl: user?.avatar || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const [notifications, setNotifications] = useState({
    contestReminder: true,
    homeworkDeadline: true,
    submissionResult: true,
    systemAnnouncement: false,
    emailNotification: true,
  });

  const [preferences, setPreferences] = useState({
    editorTheme: 'auto',
    fontSize: '14',
    tabSize: '4',
  });

  // Tải thông tin mới nhất từ database khi mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    apiFetch<any>('/api/v1/users/me')
      .then((data) => {
        if (!isMounted) return;
        setProfileForm({
          fullName: data.full_name || data.username || '',
          email: data.email || '',
          studentCode: data.student_code || '',
          bio: data.bio || '',
          institution: data.institution || '',
          avatarUrl: data.avatar_url || '',
        });

        if (data.notification_settings) {
          setNotifications((prev) => ({ ...prev, ...data.notification_settings }));
        }

        if (data.preferences) {
          setPreferences((prev) => ({ ...prev, ...data.preferences }));
        }
      })
      .catch((err) => {
        console.error('Không thể tải profile:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerSavedFeedback = (msg: string) => {
    setSavedSuccess(msg);
    showToast(msg, 'success');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  // Lưu thông tin hồ sơ
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await apiFetch<any>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: profileForm.fullName.trim(),
          institution: profileForm.institution.trim(),
          bio: profileForm.bio.trim(),
          avatar_url: profileForm.avatarUrl.trim() || null,
        }),
      });

      updateUser({
        fullName: updated.full_name || profileForm.fullName,
        institution: updated.institution || profileForm.institution,
        bio: updated.bio || profileForm.bio,
        avatar: updated.avatar_url || profileForm.avatarUrl,
      });

      triggerSavedFeedback(t('settings.savedSuccess'));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : t('settings.errors.saveProfileFailed');
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError(t('settings.errors.currentPasswordRequired'));
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError(t('settings.errors.newPasswordRequired'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t('settings.errors.newPasswordTooShort'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('settings.errors.confirmPasswordMismatch'));
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch('/api/v1/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      triggerSavedFeedback(t('settings.savedSuccess'));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : t('settings.errors.changePasswordFailed');
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu cài đặt thông báo
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          notification_settings: notifications,
        }),
      });

      updateUser({ notificationSettings: notifications });
      triggerSavedFeedback(t('settings.savedSuccess'));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : t('settings.errors.saveNotificationsFailed');
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu tuỳ chỉnh giao diện / editor
  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences,
        }),
      });

      saveAndBroadcastEditorPreferences(preferences);
      updateUser({ preferences });
      triggerSavedFeedback(t('settings.savedSuccess'));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : t('settings.errors.savePreferencesFailed');
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabProfile'), icon: <UserIcon size={18} /> },
    { id: 'password', label: t('settings.tabPassword'), icon: <Lock size={18} /> },
    { id: 'notifications', label: t('settings.tabNotifications'), icon: <Bell size={18} /> },
    { id: 'preferences', label: t('settings.tabPreferences'), icon: <Palette size={18} /> },
  ];

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('breadcrumb.settings')}</h2>
          <p className="text-xs text-(--ws-muted) mt-1">
            {t('settings.pageSubtitle', {
              role: user?.role === 'instructor' ? t('settings.accountTypeInstructor') : t('settings.accountTypeStudent'),
            })}
          </p>
        </div>

        {savedSuccess && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-(--ws-ok) text-sm font-medium animate-fade-in">
            <CheckCircle2 size={16} aria-hidden="true" /> {savedSuccess}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-(--ws-panel) border border-(--ws-border) rounded-xl shadow-sm">
          <Loader2 className="animate-spin text-(--ws-accent)" size={28} />
          <span className="ml-3 text-sm text-(--ws-text)">{t('settings.loading')}</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="lg:w-56 shrink-0">
            <div role="tablist" aria-orientation="vertical" className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-2 space-y-1 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPasswordError('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-(--ws-accent-soft) text-(--ws-accent) font-semibold border border-(--ws-accent)/30'
                      : 'text-(--ws-text) hover:bg-(--ws-hover) hover:text-(--ws-text) border border-transparent'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {/* Tab 1: Hồ sơ */}
            {activeTab === 'profile' && (
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-(--ws-text)">{t('settings.profileInfoTitle')}</h3>

                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-2xl flex items-center justify-center text-(--ws-on-accent) text-2xl font-bold font-serif relative shadow-md overflow-hidden shrink-0">
                    {profileForm.avatarUrl ? (
                      <img
                        src={profileForm.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      profileForm.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-(--ws-text) font-serif font-bold text-lg">
                      {profileForm.fullName || user?.username}
                    </p>
                    <p className="text-sm text-(--ws-muted)">@{user?.username}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-(--ws-accent)/10 text-(--ws-accent)">
                      {user?.role === 'instructor' ? t('settings.accountTypeInstructor') : t('settings.accountTypeStudent')}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.fullNameLabel')} <span className="text-(--ws-danger)">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      placeholder={t('settings.fullNameLabel')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.emailImmutable')}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-(--ws-muted) cursor-not-allowed"
                    />
                  </div>
                </div>

                {user?.role !== 'instructor' && (
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.studentIdImmutable')}
                    </label>
                    <input
                      type="text"
                      value={profileForm.studentCode || t('settings.studentIdEmpty')}
                      disabled
                      className="w-full px-4 py-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-(--ws-muted) cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                    {t('settings.avatarUrlLabel')}
                  </label>
                  <input
                    type="url"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                    placeholder={t('settings.avatarPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                    {t('settings.institutionLabel')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.institution}
                    onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                    className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                    placeholder={t('settings.institutionPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                    {t('settings.bioLabel')}
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) resize-none"
                    placeholder={t('settings.bioPlaceholder')}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('settings.saveChangesBtn')}
                </button>
              </div>
            )}

            {/* Tab 2: Mật khẩu */}
            {activeTab === 'password' && (
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-(--ws-text)">{t('settings.changePasswordTitle')}</h3>

                {passwordError && (
                  <div className="p-3 bg-(--ws-danger-soft) border border-(--ws-danger)/35 text-(--ws-danger) text-sm rounded-xl">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.currentPasswordLabel')} <span className="text-(--ws-danger)">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      placeholder={t('settings.currentPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.passwordMinLengthHint')} <span className="text-(--ws-danger)">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      placeholder={t('settings.newPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">
                      {t('settings.confirmPasswordLabel')} <span className="text-(--ws-danger)">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      placeholder={t('settings.confirmPasswordPlaceholder')}
                    />
                  </div>
                </div>

                <div className="p-4 bg-(--ws-warn-soft) border border-(--ws-warn)/35 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Shield size={18} className="text-(--ws-warn) mt-0.5" />
                    <div>
                      <p className="text-sm text-(--ws-warn) font-bold font-serif">{t('settings.securityNoteTitle')}</p>
                      <p className="text-xs text-(--ws-muted) mt-1 leading-relaxed">
                        {t('settings.securityNoteDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {t('settings.changePasswordBtn')}
                </button>
              </div>
            )}

            {/* Tab 3: Thông báo */}
            {activeTab === 'notifications' && (
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-(--ws-text)">{t('settings.notificationSettingsTitle')}</h3>
                <div className="space-y-4">
                  {[
                    { key: 'contestReminder', label: t('settings.notifContestLabel'), desc: t('settings.notifContestDesc') },
                    { key: 'homeworkDeadline', label: t('settings.notifHomeworkLabel'), desc: t('settings.notifHomeworkDesc') },
                    { key: 'submissionResult', label: t('settings.notifSubmissionLabel'), desc: t('settings.notifSubmissionDesc') },
                    { key: 'systemAnnouncement', label: t('settings.notifSystemLabel'), desc: t('settings.notifSystemDesc') },
                    { key: 'emailNotification', label: t('settings.notifEmailLabel'), desc: t('settings.notifEmailDesc') },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-(--ws-panel2)/50 rounded-xl border border-(--ws-border)">
                      <div>
                        <p className="text-sm font-semibold text-(--ws-text)">{item.label}</p>
                        <p className="text-xs text-(--ws-muted) mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifications[item.key as keyof typeof notifications]}
                        aria-label={item.label}
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          })
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                          notifications[item.key as keyof typeof notifications] ? 'bg-(--ws-accent)' : 'bg-(--ws-border)'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-(--ws-panel) rounded-full transition-all shadow-sm ${
                            notifications[item.key as keyof typeof notifications] ? 'left-6' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('settings.saveNotificationsBtn')}
                </button>
              </div>
            )}

            {/* Tab 4: Tuỳ chỉnh */}
            {activeTab === 'preferences' && (
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-(--ws-text)">{t('settings.tabPreferences')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">{t('settings.interfaceLanguageLabel')}</label>
                    <select
                      value={i18n.resolvedLanguage ?? i18n.language}
                      onChange={(e) => void i18n.changeLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                    >
                      <option value="vi">{t('topbar.langVi')}</option>
                      <option value="en">{t('topbar.langEn')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--ws-text) mb-1.5">{t('settings.editorThemeLabel')}</label>
                    <select
                      value={preferences.editorTheme}
                      onChange={(e) => setPreferences({ ...preferences, editorTheme: e.target.value })}
                      className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                    >
                      <option value="auto">{t('settings.themeSystemAuto', 'Theo giao diện hệ thống (Tự động)')}</option>
                      <option value="vs-dark">{t('settings.themeDarkDefault')}</option>
                      <option value="light">{t('settings.themeLight')}</option>
                      <option value="monokai">Monokai</option>
                      <option value="github-dark">GitHub Dark</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-(--ws-text) mb-1.5">{t('settings.fontSizeCodeLabel')}</label>
                      <select
                        value={preferences.fontSize}
                        onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value })}
                        className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      >
                        <option value="12">12px</option>
                        <option value="14">{t('settings.standardOption', { value: '14px' })}</option>
                        <option value="16">16px</option>
                        <option value="18">18px</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-(--ws-text) mb-1.5">{t('settings.tabSpacingLabel')}</label>
                      <select
                        value={preferences.tabSize}
                        onChange={(e) => setPreferences({ ...preferences, tabSize: e.target.value })}
                        className="w-full px-4 py-2.5 bg-(--ws-panel2)/50 border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                      >
                        <option value="2">{t('settings.spacesOption', { count: 2 })}</option>
                        <option value="4">{t('settings.standardOption', { value: t('settings.spacesOption', { count: 4 }) })}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('settings.savePreferencesBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}