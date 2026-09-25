import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  Save,
  Camera,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    institution: user?.institution || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabProfile'), icon: <User size={18} /> },
    { id: 'password', label: t('settings.tabPassword'), icon: <Lock size={18} /> },
    { id: 'notifications', label: t('topbar.notifications'), icon: <Bell size={18} /> },
    { id: 'preferences', label: t('settings.tabPreferences'), icon: <Palette size={18} /> },
  ];

  const notificationItems = [
    { key: 'contestReminder', label: t('settings.notifContestLabel'), desc: t('settings.notifContestDesc') },
    { key: 'homeworkDeadline', label: t('settings.notifHomeworkLabel'), desc: t('settings.notifHomeworkDesc') },
    { key: 'submissionResult', label: t('settings.notifSubmissionLabel'), desc: t('settings.notifSubmissionDesc') },
    { key: 'systemAnnouncement', label: t('settings.notifSystemLabel'), desc: t('settings.notifSystemDesc') },
    { key: 'emailNotification', label: t('settings.notifEmailLabel'), desc: t('settings.notifEmailDesc') },
  ];

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('breadcrumb.settings')}</h2>
        {saved && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm animate-pulse font-medium">
            <CheckCircle2 size={16} /> {t('settings.savedSuccess')}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white border border-[#e5dac9] rounded-xl p-2 space-y-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
              <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.profileInfoTitle')}</h3>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-serif relative shadow-md">
                  {user?.fullName?.charAt(0)}
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#cc5a37] rounded-lg flex items-center justify-center text-white hover:bg-[#b04829] transition-colors shadow-md border-2 border-white">
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <p className="text-[#191919] font-serif font-bold text-lg">{user?.fullName}</p>
                  <p className="text-sm text-[#8a8073]">@{user?.username}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.fullNameLabel')}</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.institutionLabel')}</label>
                <input
                  type="text"
                  value={profileForm.institution}
                  onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.bioLabel')}</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md"
              >
                <Save size={16} /> {t('instructorHomework.saveChanges')}
              </button>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
              <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.changePasswordTitle')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.currentPasswordLabel')}</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    placeholder={t('settings.currentPasswordPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.newPasswordLabel')}</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    placeholder={t('settings.newPasswordPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.confirmPasswordLabel')}</label>
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
                    <p className="text-xs text-[#8a8073] mt-1 leading-relaxed">{t('settings.securityNoteDesc')}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md"
              >
                <Lock size={16} /> {t('settings.changePasswordBtn')}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
              <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.notificationSettingsTitle')}</h3>
              <div className="space-y-4">
                {notificationItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]">
                    <div>
                      <p className="text-sm font-semibold text-[#191919]">{item.label}</p>
                      <p className="text-xs text-[#8a8073] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
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
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 space-y-6 shadow-sm">
              <h3 className="text-lg font-bold font-serif text-[#191919]">{t('settings.tabPreferences')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.interfaceLanguageLabel')}</label>
                  <select
                    value={i18n.language}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
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
                    <option value="vs-dark">VS Dark</option>
                    <option value="monokai">Monokai</option>
                    <option value="github-dark">GitHub Dark</option>
                    <option value="dracula">Dracula</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.fontSizeLabel')}</label>
                    <select
                      value={preferences.fontSize}
                      onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    >
                      <option value="12">12px</option>
                      <option value="14">14px</option>
                      <option value="16">16px</option>
                      <option value="18">18px</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5c5446] mb-1.5">{t('settings.tabSizeLabel')}</label>
                    <select
                      value={preferences.tabSize}
                      onChange={(e) => setPreferences({ ...preferences, tabSize: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f4eb]/50 border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                    >
                      <option value="2">{t('settings.spacesOption', { count: 2 })}</option>
                      <option value="4">{t('settings.spacesOption', { count: 4 })}</option>
                      <option value="8">{t('settings.spacesOption', { count: 8 })}</option>
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md"
              >
                <Save size={16} /> {t('settings.savePreferencesBtn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
