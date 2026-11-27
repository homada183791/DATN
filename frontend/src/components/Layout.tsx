import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Navigate, useNavigate, matchPath } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProblemsQuery } from '../api/problems';
import { useClassesQuery } from '../api/classes';
import { useNotifications } from '../context/NotificationContext';
import { useLockdownActive } from '../context/lockdownStore';
import CompleteProfileModal from './CompleteProfileModal';
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

/** Các trang có thật (giữ khớp với App.tsx) — dùng để breadcrumb không tạo link dẫn ra 404. */
const ROUTE_PATTERNS = [
  '/student', '/student/dashboard', '/student/homeworks', '/student/class', '/student/class/:classId',
  '/student/class/:classId/homework/:homeworkId', '/student/class/:classId/homework/:homeworkId/problem/:problemId',
  '/student/contest/:contestId/problem/:problemId', '/student/problem/:id', '/student/problems', '/student/contest',
  '/student/calendar', '/student/submission', '/student/submissions', '/student/profile', '/student/settings',
  '/instructor', '/instructor/dashboard', '/instructor/classes', '/instructor/class/:classId', '/instructor/classes/:classId',
  '/instructor/calendar', '/instructor/contest', '/instructor/students', '/instructor/homework', '/instructor/problems',
  '/instructor/problem/:id', '/instructor/submission', '/instructor/submissions', '/instructor/profile', '/instructor/settings',
];
const isRealRoute = (path: string) => ROUTE_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, path));

/** Mục "danh sách" ngay sau vai trò mà địa chỉ ghép ra không có trang (vd /instructor/class) → trang danh sách thật. */
const LIST_ALIASES: Record<string, Record<string, string>> = {
  student: { class: '/student/class', classes: '/student/class', problem: '/student/problems', homework: '/student/homeworks' },
  instructor: { class: '/instructor/classes', classes: '/instructor/classes', problem: '/instructor/problems', homework: '/instructor/homework', homeworks: '/instructor/homework' },
};

/**
 * Link cho mục thứ `index` của breadcrumb, hoặc null nếu không có trang tương ứng (khi đó chỉ hiện chữ).
 * - Địa chỉ ghép ra là trang thật → dùng luôn.
 * - Mục danh sách ngay sau vai trò → trang danh sách thật (class → classes, problem → problems...).
 * - Mục danh sách nằm sâu bên trong (vd .../class/<id>/homework) → về trang cha nếu trang cha có thật.
 */
export function breadcrumbHref(segments: string[], index: number): string | null {
  const prefix = '/' + segments.slice(0, index + 1).join('/');
  if (isRealRoute(prefix)) return prefix;
  const role = segments[0];
  if (index === 1 && LIST_ALIASES[role]?.[segments[1]]) return LIST_ALIASES[role][segments[1]];
  const isIdLike = /^[0-9a-f-]{8,}$/i.test(segments[index]) || /\d/.test(segments[index]);
  if (!isIdLike && index >= 2) {
    const parent = '/' + segments.slice(0, index).join('/');
    if (isRealRoute(parent)) return parent;
  }
  return null;
}

function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const { data: classList = [] } = useClassesQuery();
  const { data: problemList = [] } = useProblemsQuery();

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
    // "homework"/"homeworks" dùng chung 1 từ trong URL cho cả 2 vai trò,
    // nhưng ý nghĩa khác nhau: giảng viên "giao bài tập", sinh viên "xem
    // bài tập của mình" — nên không thể gộp vào từ điển `labels` phía trên
    // (nó không biết đoạn URL đang thuộc nhánh /instructor hay /student).
    if (segment === 'homework' || segment === 'homeworks') {
      return pathSegments[0] === 'instructor' ? t('nav.homework') : t('nav.myHomework');
    }
    if (labels[segment]) return labels[segment];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /\d/.test(segment)) {
      // Đoạn ID trong URL: không hiện mã hệ thống, đổi sang tên lớp / tên bài, hoặc chữ "Chi tiết"
      const idx = pathSegments.indexOf(segment);
      const prev = pathSegments[idx - 1];
      if (prev === 'class' || prev === 'classes') {
        const cls = classList.find((c) => c.id === segment);
        if (cls) return cls.subject ? `${cls.subject} - ${cls.name}` : cls.name;
      }
      if (prev === 'problem' || prev === 'problems') {
        const pr = problemList.find((x) => x.id === segment);
        if (pr) return pr.title;
      }
      return t('breadcrumb.detail');
    }
    return segment;
  };

  return (
    <nav className="flex items-center text-sm text-(--ws-muted) mb-4">
      <Link to="/" className="hover:text-(--ws-accent) transition-colors">
        <Code2 size={16} />
      </Link>
      {pathSegments.map((segment, index) => (
        <span key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-2 text-(--ws-faint)" />
          {index === pathSegments.length - 1 ? (
            <span className="text-(--ws-text) font-medium" aria-current="page">{formatSegment(segment)}</span>
          ) : (() => {
            const href = breadcrumbHref(pathSegments, index);
            return href ? (
              <Link to={href} className="hover:text-(--ws-accent) transition-colors">
                {formatSegment(segment)}
              </Link>
            ) : (
              <span>{formatSegment(segment)}</span>
            );
          })()}
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
  const lockdown = useLockdownActive(); // đang thi ở chế độ Lockdown → ẩn sidebar và navbar
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
        { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/instructor/contest' },
        { label: t('nav.calendar'), icon: <Calendar size={20} />, path: '/instructor/calendar' },
        { label: t('nav.problemBank'), icon: <BookOpen size={20} />, path: '/instructor/problems' },
      ]
    : [
        { label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
        { label: t('nav.class'), icon: <GraduationCap size={20} />, path: '/student/class' },
        { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/student/contest' },
        { label: t('nav.practiceProblems', 'Kho bài tập'), icon: <Code2 size={20} />, path: '/student/problems' },
        { label: t('nav.calendar'), icon: <Calendar size={20} />, path: '/student/calendar' },
        { label: t('nav.submission'), icon: <Send size={20} />, path: '/student/submission' },
      ];
  const filteredProblems = problems.filter(
    (p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden bg-(--ws-bg) flex text-(--ws-text)">
      {(user?.missingFields?.username || user?.missingFields?.studentCode) && <CompleteProfileModal />}
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
      {!lockdown && (
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-(--ws-panel) border-r border-(--ws-border) transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:shrink-0 ${
          sidebarOpen ? 'w-52' : 'w-20'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-(--ws-border-soft)">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className="shrink-0 w-10 h-10 border-(--ws-border) rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo-hcmus.png" alt="HCMUS logo" className="w-full h-full object-contain p-1" />
            </div>
            {sidebarOpen && (
              <div className="leading-tight whitespace-nowrap">
                <p className="text-[17px] font-bold text-(--ws-text) font-serif tracking-tight">JudgeHub</p>
                <p className="text-[11px] text-(--ws-muted)">University of Science</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav aria-label="Điều hướng chính" className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
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
                aria-current={isActive ? 'page' : undefined}
                title={sidebarOpen ? undefined : item.label}
                className={`flex items-center gap-3 px-3 min-h-11 rounded-lg transition-colors duration-150 group ${
                  isActive
                    ? 'bg-(--ws-accent-soft) text-(--ws-accent) font-semibold'
                    : 'text-(--ws-muted) hover:bg-(--ws-hover) hover:text-(--ws-text)'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-(--ws-accent)' : 'text-(--ws-muted) group-hover:text-(--ws-text)'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-(--ws-border-soft) p-3">
          <Link
            to={user?.role === 'instructor' ? '/instructor/profile' : '/student/profile'}
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl border border-(--ws-border) hover:bg-(--ws-hover) transition-colors"
          >
            <div className="shrink-0 w-9 h-9 bg-(--ws-accent) rounded-full flex items-center justify-center text-(--ws-panel) font-bold text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--ws-text) truncate">{user?.fullName || user?.username}</p>
                <p className="text-xs text-(--ws-muted) truncate">{user?.role === 'instructor' ? t('personal.roleInstructor') : t('personal.roleStudent')}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        {!lockdown && (
        <header className="sticky top-0 z-50 h-16 shrink-0 bg-(--ws-bg) border-b border-(--ws-border) flex items-center px-4 lg:px-6 gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen(!mobileSidebarOpen);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            aria-label={sidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-(--ws-muted) hover:bg-(--ws-hover) hover:text-(--ws-text) transition-colors"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {!fullBleed && (
            <nav className="hidden md:flex items-center text-[13.5px] text-(--ws-muted)">
              <span className="font-semibold text-(--ws-text)">JudgeHub</span>
              <ChevronRight size={14} className="mx-1.5 text-(--ws-faint)" />
              <span className="text-(--ws-text)">
                {user?.role === 'instructor' ? t('personal.roleInstructor') : t('personal.roleStudent')}
              </span>
            </nav>
          )}

          <div className="flex-1" />

          {/* Global search */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder={t('topbar.searchPlaceholder')}
              aria-label={t('topbar.searchPlaceholder')}
              className="w-48 lg:w-72 h-10 pl-9 pr-10 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-[13px] text-(--ws-text) placeholder:text-(--ws-faint) focus:outline-none focus:border-(--ws-accent)"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-(--ws-border) text-(--ws-muted) font-mono">⌘K</kbd>
            {searchOpen && query && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-(--ws-panel2) border border-(--ws-border) rounded-xl shadow-2xl overflow-hidden z-60 animate-slide-up">
                <p className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-widest text-(--ws-muted) border-b border-(--ws-border)">{t('topbar.searchResults')}</p>
                {filteredProblems.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to={`/student/problem/${p.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-(--ws-hover) text-[13px] text-(--ws-text)"
                  >
                    <span className="font-medium truncate">{p.title}</span>
                  </Link>
                ))}
                {filteredProblems.length === 0 && (
                  <p className="px-4 py-3 text-[13px] text-(--ws-muted)">{t('topbar.searchEmpty')}</p>
                )}
              </div>
            )}
          </div>

          {/* Palette picker */}
          <div className="relative">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className={`p-2 rounded-lg transition-colors ${
                paletteOpen ? 'text-(--ws-accent) bg-(--ws-panel2)/60' : 'text-(--ws-muted) hover:text-(--ws-accent) hover:bg-(--ws-hover)/60'
              }`}
              title={t('topbar.palette')}
            >
              <Palette size={18} />
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-(--ws-panel2) border border-(--ws-border) rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-(--ws-muted) border-b border-(--ws-border)">
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
                            className="w-5 h-5 rounded-full border-2 border-(--ws-border) shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-(--ws-text)">{t.name}</span>
                        <span className="block text-[11px] text-(--ws-muted)">{t.desc}</span>
                      </span>
                      {theme.id === t.id && <Check size={15} className="text-(--ws-accent) shrink-0" />}
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
                langOpen ? 'text-(--ws-accent) bg-(--ws-panel2)/60' : 'text-(--ws-muted) hover:text-(--ws-accent) hover:bg-(--ws-hover)/60'
              }`}
              title={t('topbar.language')}
              aria-label={t('topbar.language')}
            >
              <Languages size={18} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-(--ws-panel2) border border-(--ws-border) rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden p-1.5">
                {(['vi', 'en'] as const).map((language) => (
                  <button
                    key={language}
                    onClick={() => {
                      void i18n.changeLanguage(language);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-colors ${
                      i18n.resolvedLanguage === language ? 'bg-(--ws-accent-soft) text-(--ws-accent) font-semibold' : 'text-(--ws-text) hover:bg-(--ws-hover)'
                    }`}
                  >
                    <span className="w-6 h-4 flex items-center justify-center rounded-[3px] border border-(--ws-border) text-[8px] font-bold bg-(--ws-panel) text-(--ws-muted)">
                      {language.toUpperCase()}
                    </span>
                    {t(language === 'vi' ? 'topbar.langVi' : 'topbar.langEn')}
                    {i18n.resolvedLanguage === language && <Check size={13} className="ml-auto text-(--ws-accent)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover)/60 transition-colors"
              title={t('topbar.notifications')}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-(--ws-danger) border-2 border-(--ws-border) flex items-center justify-center text-(--ws-on-accent) text-[10px] font-bold leading-none px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-(--ws-panel2) border border-(--ws-border) rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-(--ws-border)">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-(--ws-muted)" />
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-(--ws-muted)">{t('topbar.notifications')}</p>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-(--ws-danger)/10 text-(--ws-danger) text-[10px] font-bold">{t('topbar.unreadCount', { count: unreadCount })}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] text-(--ws-accent) hover:text-(--ws-accent) font-medium transition-colors"
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
                    <div className="flex flex-col items-center justify-center py-10 text-(--ws-muted)">
                      <Bell size={28} className="mb-2 opacity-30" />
                      <p className="text-[13px]">{t('topbar.notificationsEmpty')}</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const icon = {
                        submission_judged: <Award size={15} className="shrink-0 text-(--ws-ok)" />,
                        homework_assigned: <FileText size={15} className="shrink-0 text-(--ws-info)" />,
                        contest_starting_soon: <Clock size={15} className="shrink-0 text-(--ws-warn)" />,
                        contest_started: <Trophy size={15} className="shrink-0 text-(--ws-warn)" />,
                        class_enrolled: <Users size={15} className="shrink-0 text-(--ws-info)" />,
                      }[n.type] ?? <Bell size={15} className="shrink-0 text-(--ws-muted)" />;

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
                          className={`group flex items-start gap-3 px-4 py-3 border-b border-(--ws-border)/60 cursor-pointer transition-colors ${
                            n.is_read ? 'hover:bg-(--ws-hover)' : 'bg-(--ws-accent)/5 hover:bg-(--ws-accent)/10'
                          }`}
                          onClick={async () => {
                            if (!n.is_read) await markRead(n.id);
                            if (n.link) { navigate(n.link); setBellOpen(false); }
                          }}
                        >
                          <div className="mt-0.5">{icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${n.is_read ? 'text-(--ws-text)' : 'font-semibold text-(--ws-text)'}`}>
                              {n.title}
                            </p>
                            <p className="text-[11.5px] text-(--ws-muted) mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10.5px] text-(--ws-faint) mt-1">{timeAgo}</p>
                          </div>
                          {!n.is_read && (
                            <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-(--ws-danger)" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-(--ws-danger-soft) text-(--ws-muted) hover:text-(--ws-danger) transition-all"
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
                    <div className="p-3 text-center border-t border-(--ws-border)/60">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="text-[12px] text-(--ws-accent) font-medium hover:underline disabled:opacity-50"
                      >
                        {loading ? t('topbar.loading') : t('topbar.loadMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats chips (ẩn với giảng viên) */}
          {user?.role !== 'instructor' && (
            <>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-(--ws-panel2) rounded-lg border border-(--ws-border)">
              <Trophy size={14} className="text-(--ws-danger)" />
              <span className="text-sm text-(--ws-danger) font-semibold font-mono">{user?.rating}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-(--ws-panel2) rounded-lg border border-(--ws-border)">
              <BookOpen size={14} className="text-(--ws-accent)" />
              <span className="text-sm text-(--ws-accent) font-semibold font-mono">{user?.solvedCount}</span>
            </div>
            </>
          )}

          {/* Avatar + dropdown */}
          <div className="relative pl-3 border-l border-(--ws-border)">
            <button
              onClick={() => setAvatarOpen(!avatarOpen)}
              className={`flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors ${
                avatarOpen ? 'bg-(--ws-panel2)/60' : 'hover:bg-(--ws-hover)/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) flex items-center justify-center text-(--ws-on-accent) text-sm font-bold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
                )}
              </div>
              <ChevronDown size={15} className={`text-(--ws-muted) transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-(--ws-panel2) border border-(--ws-border) rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--ws-border) bg-(--ws-panel2)/50">
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) flex items-center justify-center text-(--ws-on-accent) text-base font-bold shrink-0 overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                    ) : (
                      user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--ws-text) truncate">{user?.fullName}</p>
                    <p className="text-xs text-(--ws-muted) truncate">{user?.email}</p>
                  </div>
                </div>

                {/* stats (mobile visibility) */}
                {user?.role !== 'instructor' && (
                  <div className="flex md:hidden items-center gap-2 px-4 py-2.5 border-b border-(--ws-border)/60">
                    <span className="flex items-center gap-1 text-xs text-(--ws-danger) font-semibold">
                      <Trophy size={13} /> {user?.rating}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-(--ws-accent) font-semibold">
                      <BookOpen size={13} /> {user?.solvedCount}
                    </span>
                  </div>
                )}

                {/* menu */}
                <div className="p-1.5">
                  <Link
                    to={user?.role === 'instructor' ? '/instructor/profile' : '/student/profile'}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
                  >
                    <User size={17} className="text-(--ws-muted)" /> {t('userMenu.myProfile')}
                  </Link>
                  <Link
                    to={user?.role === 'instructor' ? '/instructor/settings' : '/student/settings'}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
                  >
                    <Settings size={17} className="text-(--ws-muted)" /> {t('userMenu.settings')}
                  </Link>
                </div>

                {/* logout */}
                <div className="p-1.5 border-t border-(--ws-border)/60">
                  <button
                    onClick={() => { setAvatarOpen(false); logout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-(--ws-danger) hover:bg-(--ws-danger)/10 transition-colors"
                  >
                    <LogOut size={17} /> {t('userMenu.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        )}

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