import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProblemsQuery } from '../api/problems';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Send,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Code2,
  User,
  ClipboardList,
  GraduationCap,
  Bell,
  Search,
  Palette,
  Languages,
  Check,
  ChevronDown,
  Calendar,
  CheckCheck,
  FileText,
  Award,
  Clock,
  Trash2,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    student: t('breadcrumb.student'),
    instructor: t('breadcrumb.instructor'),
    dashboard: t('breadcrumb.dashboard'),
    problems: t('breadcrumb.problems'),
    problem: t('breadcrumb.problem'),
    homework: t('breadcrumb.homework'),
    homeworks: t('breadcrumb.homework'),
    contest: t('breadcrumb.contest'),
    submission: user?.role === 'instructor' ? t('breadcrumb.gradingSubmissions', 'Chấm bài & Bài nộp') : t('breadcrumb.submission'),
    submissions: user?.role === 'instructor' ? t('breadcrumb.gradingSubmissions', 'Chấm bài & Bài nộp') : t('breadcrumb.submission'),
    class: t('breadcrumb.class'),
    classes: t('breadcrumb.class'),
    profile: t('breadcrumb.profile'),
    settings: t('breadcrumb.settings'),
    students: t('breadcrumb.students'),
    calendar: t('breadcrumb.calendar'),
  };

  const formatSegment = (segment: string) => {
    if (labels[segment]) return labels[segment];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      return `#${segment.slice(0, 8)}`;
    }
    return segment;
  };

  return (
    <nav className="flex items-center text-sm text-[#8a8073] mb-4">
      <Link to="/" className="hover:text-[#193a2b] transition-colors">
        <Code2 size={16} />
      </Link>
      {pathSegments.map((segment, index) => (
        <span key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-2 text-[#bfae99]" />
          {index === pathSegments.length - 1 ? (
            <span className="text-[#191919] font-medium">{formatSegment(segment)}</span>
          ) : (
            <Link
              to={'/' + pathSegments.slice(0, index + 1).join('/')}
              className="hover:text-[#193a2b] transition-colors"
            >
              {formatSegment(segment)}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function Layout({ children, fullBleed = false }: { children: React.ReactNode; fullBleed?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated, isInitializing } = useAuth();
  const { theme, setThemeId, themes } = useTheme();
  const { data: problems = [] } = useProblemsQuery();
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, loadMore, hasMore, loading } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  /* ⌘K opens global search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') { setSearchOpen(false); setBellOpen(false); setPaletteOpen(false); setLangOpen(false); setAvatarOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen bg-(--ws-bg) flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-(--ws-border) border-t-(--ws-accent) animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const items: SidebarItem[] = user?.role === 'instructor'
    ? [
        { label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, path: '/instructor/dashboard' },
        { label: t('nav.class'), icon: <GraduationCap size={20} />, path: '/instructor/classes' },
        { label: t('nav.homework'), icon: <ClipboardList size={20} />, path: '/instructor/homework' },
        { label: t('nav.gradingSubmissions', 'Chấm bài & Bài nộp'), icon: <Send size={20} />, path: '/instructor/submissions' },
        { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/instructor/contest' },
        { label: t('nav.calendar'), icon: <Calendar size={20} />, path: '/instructor/calendar' },
        { label: t('nav.students'), icon: <Users size={20} />, path: '/instructor/students' },
        { label: t('nav.problemBank'), icon: <BookOpen size={20} />, path: '/instructor/problems' },
      ]
    : [
        { label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
        { label: t('nav.practiceProblems', 'Kho bài tập'), icon: <Code2 size={20} />, path: '/student/problems' },
        { label: t('nav.studentHomework', 'Bài tập'), icon: <BookOpen size={20} />, path: '/student/homeworks' },
        { label: t('nav.class'), icon: <GraduationCap size={20} />, path: '/student/class' },
        { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/student/contest' },
        { label: t('nav.calendar'), icon: <Calendar size={20} />, path: '/student/calendar' },
        { label: t('nav.submission'), icon: <Send size={20} />, path: '/student/submission' },
      ];
  const filteredProblems = problems.filter(
    (p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden bg-(--ws-bg) flex text-(--ws-text)">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Click-away layer for topbar dropdowns */}
      {(bellOpen || paletteOpen || langOpen || avatarOpen || searchOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setBellOpen(false); setPaletteOpen(false); setLangOpen(false); setAvatarOpen(false); setSearchOpen(false); }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#f0ebd9] border-r border-[#e5dac9] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-[#e5dac9]">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className="shrink-0 w-10 h-10 border-[#e5dac9] rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo-hcmus.png" alt="HCMUS logo" className="w-full h-full object-contain p-1" />
            </div>
            {sidebarOpen && (
              <div className="leading-tight whitespace-nowrap">
                <p className="text-[17px] font-bold text-[#191919] font-serif tracking-tight">JudgeHub</p>
                <p className="text-[10.5px] text-[#8a8073]">University Of Science</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/student/problems' && location.pathname.startsWith('/student/problem')) ||
              (item.path === '/instructor/problems' && location.pathname.startsWith('/instructor/problem')) ||
              (item.path === '/instructor/submissions' && (location.pathname === '/instructor/submission' || location.pathname === '/instructor/submissions')) ||
              (item.path === '/student/submission' && (location.pathname === '/student/submission' || location.pathname === '/student/submissions'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#e5dac9] text-[#193a2b] font-medium border border-[#d8cfbe]'
                    : 'text-[#5c5446] hover:bg-[#eadecc]/60 hover:text-[#191919] border border-transparent'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-[#193a2b]' : 'text-[#8a8073] group-hover:text-[#191919]'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-[#e5dac9] p-3 bg-[#eadecc]/20">
          <Link
            to={user?.role === 'instructor' ? '/instructor/profile' : '/student/profile'}
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#eadecc]/60 transition-colors"
          >
            <div className="shrink-0 w-9 h-9 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#191919] truncate">{user?.fullName || user?.username}</p>
                <p className="text-xs text-[#8a8073] truncate">{user?.role === 'instructor' ? t('personal.roleInstructor') : t('personal.roleStudent')}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 shrink-0 bg-[#f7f4eb]/80 backdrop-blur-xl border-b border-[#e5dac9] flex items-center px-4 lg:px-6 gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen(!mobileSidebarOpen);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="p-2 rounded-lg text-[#5c5446] hover:bg-[#eadecc]/60 hover:text-[#191919] transition-colors"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {!fullBleed && (
            <nav className="hidden md:flex items-center text-[13.5px] text-[#8a8073]">
              <span className="font-semibold text-[#191919]">JudgeHub</span>
              <ChevronRight size={14} className="mx-1.5 text-[#bfae99]" />
              <span className="text-[#5c5446]">
                {user?.role === 'instructor' ? t('personal.roleInstructor') : t('personal.roleStudent')}
              </span>
            </nav>
          )}

          <div className="flex-1" />

          {/* Global search */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder={t('topbar.searchPlaceholder')}
              className="w-48 lg:w-72 pl-9 pr-10 py-2 bg-[#f0ebd9] border border-[#e5dac9] rounded-lg text-[13px] text-[#191919] placeholder-[#bfae99] focus:outline-none focus:border-[#193a2b]"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-[#e5dac9] text-[#8a8073] font-mono">⌘K</kbd>
            {searchOpen && query && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl overflow-hidden z-60 animate-slide-up">
                <p className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">{t('topbar.searchResults')}</p>
                {filteredProblems.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to={`/student/problem/${p.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-(--ws-hover) text-[13px] text-[#191919]"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-[11px] text-[#8a8073] font-mono">{p.id}</span>
                  </Link>
                ))}
                {filteredProblems.length === 0 && (
                  <p className="px-4 py-3 text-[13px] text-[#8a8073]">{t('topbar.searchEmpty')}</p>
                )}
              </div>
            )}
          </div>

          {/* Palette picker */}
          <div className="relative">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className={`p-2 rounded-lg transition-colors ${
                paletteOpen ? 'text-[#193a2b] bg-[#eadecc]/60' : 'text-[#8a8073] hover:text-[#193a2b] hover:bg-[#eadecc]/60'
              }`}
              title={t('topbar.palette')}
            >
              <Palette size={18} />
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">
                  {t('topbar.paletteTitle')}
                </p>
                <div className="p-2 max-h-80 overflow-y-auto">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setThemeId(t.id); setPaletteOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        theme.id === t.id ? 'bg-(--ws-accent-soft)' : 'hover:bg-(--ws-hover)'
                      }`}
                    >
                      <span className="flex -space-x-1.5 shrink-0">
                        {t.sw.map((c, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full border-2 border-[#f7f4eb] shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-[#191919]">{t.name}</span>
                        <span className="block text-[11px] text-[#8a8073]">{t.desc}</span>
                      </span>
                      {theme.id === t.id && <Check size={15} className="text-[#193a2b] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className={`p-2 rounded-lg transition-colors ${
                langOpen ? 'text-[#193a2b] bg-[#eadecc]/60' : 'text-[#8a8073] hover:text-[#193a2b] hover:bg-[#eadecc]/60'
              }`}
              title={t('topbar.language')}
              aria-label={t('topbar.language')}
            >
              <Languages size={18} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-[60] animate-slide-up overflow-hidden p-1.5">
                {(['vi', 'en'] as const).map((language) => (
                  <button
                    key={language}
                    onClick={() => {
                      void i18n.changeLanguage(language);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-colors ${
                      i18n.resolvedLanguage === language ? 'bg-[var(--ws-accent-soft)] text-[#193a2b] font-semibold' : 'text-[#191919] hover:bg-[var(--ws-hover)]'
                    }`}
                  >
                    <span className="w-6 h-4 flex items-center justify-center rounded-[3px] border border-[#e5dac9] text-[8px] font-bold bg-white text-[#8a8073]">
                      {language.toUpperCase()}
                    </span>
                    {t(language === 'vi' ? 'topbar.langVi' : 'topbar.langEn')}
                    {i18n.resolvedLanguage === language && <Check size={13} className="ml-auto text-[#193a2b]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg text-[#8a8073] hover:text-[#191919] hover:bg-[#eadecc]/60 transition-colors"
              title={t('topbar.notifications')}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#cc5a37] border-2 border-[#f7f4eb] flex items-center justify-center text-white text-[10px] font-bold leading-none px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5dac9]">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-[#8a8073]" />
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073]">{t('topbar.notifications')}</p>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#cc5a37]/10 text-[#cc5a37] text-[10px] font-bold">{t('topbar.unreadCount', { count: unreadCount })}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] text-[#193a2b] hover:text-[#0d6b55] font-medium transition-colors"
                      title={t('topbar.markAllRead')}
                    >
                      <CheckCheck size={13} />
                      {t('topbar.readAll')}
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[#8a8073]">
                      <Bell size={28} className="mb-2 opacity-30" />
                      <p className="text-[13px]">{t('topbar.notificationsEmpty')}</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const icon = {
                        submission_judged: <Award size={15} className="shrink-0 text-emerald-600" />,
                        homework_assigned: <FileText size={15} className="shrink-0 text-blue-500" />,
                        contest_starting_soon: <Clock size={15} className="shrink-0 text-amber-500" />,
                        contest_started: <Trophy size={15} className="shrink-0 text-amber-500" />,
                        class_enrolled: <Users size={15} className="shrink-0 text-purple-500" />,
                      }[n.type] ?? <Bell size={15} className="shrink-0 text-[#8a8073]" />;

                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(n.created_at).getTime();
                        if (diff < 60_000) return t('topbar.justNow');
                        if (diff < 3_600_000) return t('topbar.minutesAgo', { count: Math.floor(diff / 60_000) });
                        if (diff < 86_400_000) return t('topbar.hoursAgo', { count: Math.floor(diff / 3_600_000) });
                        return t('topbar.daysAgo', { count: Math.floor(diff / 86_400_000) });
                      })();

                      return (
                        <div
                          key={n.id}
                          className={`group flex items-start gap-3 px-4 py-3 border-b border-[#e5dac9]/60 cursor-pointer transition-colors ${
                            n.is_read ? 'hover:bg-(--ws-hover)' : 'bg-[#193a2b]/5 hover:bg-[#193a2b]/10'
                          }`}
                          onClick={async () => {
                            if (!n.is_read) await markRead(n.id);
                            if (n.link) { navigate(n.link); setBellOpen(false); }
                          }}
                        >
                          <div className="mt-0.5">{icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${n.is_read ? 'text-[#5c5446]' : 'font-semibold text-[#191919]'}`}>
                              {n.title}
                            </p>
                            <p className="text-[11.5px] text-[#8a8073] mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10.5px] text-[#bfae99] mt-1">{timeAgo}</p>
                          </div>
                          {!n.is_read && (
                            <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#cc5a37]" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-[#8a8073] hover:text-red-500 transition-all"
                            title={t('topbar.deleteNotification')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}

                  {/* Load more */}
                  {hasMore && (
                    <div className="p-3 text-center border-t border-[#e5dac9]/60">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="text-[12px] text-[#193a2b] font-medium hover:underline disabled:opacity-50"
                      >
                        {loading ? t('topbar.loading') : t('topbar.loadMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats chips */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#f0ebd9] rounded-lg border border-[#e5dac9]">
            <Trophy size={14} className="text-[#cc5a37]" />
            <span className="text-sm text-[#cc5a37] font-semibold font-mono">{user?.rating}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#f0ebd9] rounded-lg border border-[#e5dac9]">
            <BookOpen size={14} className="text-[#193a2b]" />
            <span className="text-sm text-[#193a2b] font-semibold font-mono">{user?.solvedCount}</span>
          </div>

          {/* Avatar + dropdown */}
          <div className="relative pl-3 border-l border-[#e5dac9]">
            <button
              onClick={() => setAvatarOpen(!avatarOpen)}
              className={`flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors ${
                avatarOpen ? 'bg-[#eadecc]/60' : 'hover:bg-[#eadecc]/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
                )}
              </div>
              <ChevronDown size={15} className={`text-[#8a8073] transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-base font-bold shrink-0 overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                    ) : (
                      user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#191919] truncate">{user?.fullName}</p>
                    <p className="text-xs text-[#8a8073] truncate">{user?.email}</p>
                  </div>
                </div>

                {/* stats (mobile visibility) */}
                <div className="flex md:hidden items-center gap-2 px-4 py-2.5 border-b border-[#e5dac9]/60">
                  <span className="flex items-center gap-1 text-xs text-[#cc5a37] font-semibold">
                    <Trophy size={13} /> {user?.rating}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#193a2b] font-semibold">
                    <BookOpen size={13} /> {user?.solvedCount}
                  </span>
                </div>

                {/* menu */}
                <div className="p-1.5">
                  <Link
                    to={user?.role === 'instructor' ? '/instructor/profile' : '/student/profile'}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-(--ws-hover) transition-colors"
                  >
                    <User size={17} className="text-[#8a8073]" /> {t('userMenu.myProfile')}
                  </Link>
                  <Link
                    to={user?.role === 'instructor' ? '/instructor/settings' : '/student/settings'}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-(--ws-hover) transition-colors"
                  >
                    <Settings size={17} className="text-[#8a8073]" /> {t('userMenu.settings')}
                  </Link>
                </div>

                {/* logout */}
                <div className="p-1.5 border-t border-[#e5dac9]/60">
                  <button
                    onClick={() => { setAvatarOpen(false); logout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#cc5a37] hover:bg-[#cc5a37]/10 transition-colors"
                  >
                    <LogOut size={17} /> {t('userMenu.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        {fullBleed ? (
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">
            {children}
          </main>
        ) : (
          <main className="flex-1 p-6 overflow-y-scroll [scrollbar-gutter:stable]">
            <Breadcrumbs />
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
