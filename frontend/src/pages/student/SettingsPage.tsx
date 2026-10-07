import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch, ApiError } from '../../api/http';
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
    editorTheme: 'vs-dark',
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
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu hồ sơ';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
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
      const msg = err instanceof ApiError ? err.message : 'Đổi mật khẩu thất bại';
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
      const msg = err instanceof ApiError ? err.message : 'Lỗi khi lưu thông báo';
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

      window.localStorage.setItem('user_preferences', JSON.stringify(preferences));
      updateUser({ preferences });
      triggerSavedFeedback(t('settings.savedSuccess'));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Lỗi khi lưu tuỳ chỉnh';
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
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('breadcrumb.settings')}</h2>
          <p className="text-xs text-[#8a8073] mt-1">
            {t('settings.pageSubtitle', {
              role: user?.role === 'instructor' ? t('settings.accountTypeInstructor') : t('settings.accountTypeStudent'),
            })}
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-pulse">
            <CheckCircle2 size={16} /> {savedSuccess}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white border border-[#e5dac9] rounded-xl shadow-sm">
          <Loader2 className="animate-spin text-[#193a2b]" size={28} />
          <span className="ml-3 text-sm text-[#5c5446]">{t('settings.loading')}</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="lg:w-56 shrink-0">
            <div className="bg-white border border-[#e5dac9] rounded-xl p-2 space-y-1 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPasswordError('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#e5dac9] text-[#193a2b] border border-[#d8cfbe]'
                      : 'text-[#5c5446] hover:bg-[#f7f4eb] hover:text-[#191919] border border-transparent'
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
              <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.profileInfoTitle')}</h3>

                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-serif relative shadow-md overflow-hidden shrink-0">
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
                    <p className="text-[#191919] font-serif font-bold text-lg">
                      {profileForm.fullName || user?.username}
                    </p>
                    <p className="text-sm text-[#8a8073]">@{user?.username}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#193a2b]/10 text-[#193a2b]">
                      {user?.role === 'instructor' ? t('settings.accountTypeInstructor') : t('settings.accountTypeStudent')}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                      {t('settings.fullNameLabel')} <span className="text-[#cc5a37]">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      placeholder={t('settings.fullNameLabel')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                      {t('settings.emailImmutable')}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2.5 bg-gray-100 border border-[#e5dac9] rounded-xl text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                    {t('settings.avatarUrlLabel')}
                  </label>
                  <input
                    type="url"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    placeholder={t('settings.avatarPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                    {t('settings.institutionLabel')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.institution}
                    onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    placeholder={t('settings.institutionPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                    {t('settings.bioLabel')}
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                    placeholder={t('settings.bioPlaceholder')}
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('settings.saveChangesBtn')}
                </button>
              </div>
            )}

            {/* Tab 2: Mật khẩu */}
            {activeTab === 'password' && (
              <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.changePasswordTitle')}</h3>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                      {t('settings.currentPasswordLabel')} <span className="text-[#cc5a37]">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      placeholder={t('settings.currentPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                      {t('settings.passwordMinLengthHint')} <span className="text-[#cc5a37]">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      placeholder={t('settings.newPasswordPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">
                      {t('settings.confirmPasswordLabel')} <span className="text-[#cc5a37]">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      placeholder={t('settings.confirmPasswordPlaceholder')}
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Shield size={18} className="text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-700 font-bold font-serif">{t('settings.securityNoteTitle')}</p>
                      <p className="text-xs text-[#8a8073] mt-1 leading-relaxed">
                        {t('settings.securityNoteDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {t('settings.changePasswordBtn')}
                </button>
              </div>
            )}

            {/* Tab 3: Thông báo */}
            {activeTab === 'notifications' && (
              <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.notificationSettingsTitle')}</h3>
                <div className="space-y-4">
                  {[
                    { key: 'contestReminder', label: t('settings.notifContestLabel'), desc: t('settings.notifContestDesc') },
                    { key: 'homeworkDeadline', label: t('settings.notifHomeworkLabel'), desc: t('settings.notifHomeworkDesc') },
                    { key: 'submissionResult', label: t('settings.notifSubmissionLabel'), desc: t('settings.notifSubmissionDesc') },
                    { key: 'systemAnnouncement', label: t('settings.notifSystemLabel'), desc: t('settings.notifSystemDesc') },
                    { key: 'emailNotification', label: t('settings.notifEmailLabel'), desc: t('settings.notifEmailDesc') },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]">
                      <div>
                        <p className="text-sm font-semibold text-[#191919]">{item.label}</p>
                        <p className="text-xs text-[#8a8073] mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          })
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                          notifications[item.key as keyof typeof notifications] ? 'bg-[#193a2b]' : 'bg-[#d8cfbe]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                            notifications[item.key as keyof typeof notifications] ? 'left-6' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('settings.saveNotificationsBtn')}
                </button>
              </div>
            )}

            {/* Tab 4: Tuỳ chỉnh */}
            {activeTab === 'preferences' && (
              <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.tabPreferences')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.interfaceLanguageLabel')}</label>
                    <select
                      value={i18n.resolvedLanguage ?? i18n.language}
                      onChange={(e) => void i18n.changeLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    >
                      <option value="vi">{t('topbar.langVi')}</option>
                      <option value="en">{t('topbar.langEn')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.editorThemeLabel')}</label>
                    <select
                      value={preferences.editorTheme}
                      onChange={(e) => setPreferences({ ...preferences, editorTheme: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    >
                      <option value="vs-dark">{t('settings.themeDarkDefault')}</option>
                      <option value="light">{t('settings.themeLight')}</option>
                      <option value="monokai">Monokai</option>
                      <option value="github-dark">GitHub Dark</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.fontSizeCodeLabel')}</label>
                      <select
                        value={preferences.fontSize}
                        onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      >
                        <option value="12">12px</option>
                        <option value="14">{t('settings.standardOption', { value: '14px' })}</option>
                        <option value="16">16px</option>
                        <option value="18">18px</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.tabSpacingLabel')}</label>
                      <select
                        value={preferences.tabSize}
                        onChange={(e) => setPreferences({ ...preferences, tabSize: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      >
                        <option value="2">{t('settings.spacesOption', { count: 2 })}</option>
                        <option value="4">{t('settings.standardOption', { value: t('settings.spacesOption', { count: 4 }) })}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
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
