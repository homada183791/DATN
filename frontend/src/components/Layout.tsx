import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { problems, submissions, contests } from '../data/mockData';
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
  Moon,
  Sun,
  Bell,
  Languages,
  Search,
  Palette,
  Check,
  ChevronDown,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

function getStudentItems(t: (key: string) => string): SidebarItem[] {
  return [
    { label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
    { label: t('nav.problems'), icon: <BookOpen size={20} />, path: '/student/problems' },
    { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/student/contest' },
    { label: t('nav.submission'), icon: <Send size={20} />, path: '/student/submission' },
    { label: t('nav.class'), icon: <GraduationCap size={20} />, path: '/student/class' },
  ];
}

function getInstructorItems(t: (key: string) => string): SidebarItem[] {
  return [
    { label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, path: '/instructor/dashboard' },
    { label: t('nav.class'), icon: <GraduationCap size={20} />, path: '/instructor/classes' },
    { label: t('nav.homework'), icon: <ClipboardList size={20} />, path: '/instructor/homework' },
    { label: t('nav.contest'), icon: <Trophy size={20} />, path: '/instructor/contest' },
    { label: t('nav.students'), icon: <Users size={20} />, path: '/instructor/students' },
    { label: t('nav.problemBank'), icon: <BookOpen size={20} />, path: '/instructor/problems' },
  ];
}

function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    student: t('breadcrumb.student'),
    instructor: t('breadcrumb.instructor'),
    dashboard: t('breadcrumb.dashboard'),
    problems: t('breadcrumb.problems'),
    problem: t('breadcrumb.problem'),
    homework: t('breadcrumb.homework'),
    contest: t('breadcrumb.contest'),
    submission: t('breadcrumb.submission'),
    class: t('breadcrumb.class'),
    profile: t('breadcrumb.profile'),
    settings: t('breadcrumb.settings'),
    students: t('breadcrumb.students'),
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
            <span className="text-[#191919] font-medium">{labels[segment] || segment}</span>
          ) : (
            <Link
              to={'/' + pathSegments.slice(0, index + 1).join('/')}
              className="hover:text-[#193a2b] transition-colors"
            >
              {labels[segment] || segment}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function Layout({ children, fullBleed = false }: { children: React.ReactNode; fullBleed?: boolean }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { dark, toggleTheme, theme, setThemeId, themes } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const items = user?.role === 'instructor' ? getInstructorItems(t) : getStudentItems(t);

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const filteredProblems = problems.filter(
    (p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden bg-[var(--ws-bg)] flex text-[var(--ws-text)]">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Click-away layer for topbar dropdowns */}
      {(bellOpen || paletteOpen || avatarOpen || searchOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setBellOpen(false); setPaletteOpen(false); setLangOpen(false); setAvatarOpen(false); setSearchOpen(false); }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#f0ebd9] border-r border-[#e5dac9] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:flex-shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-[#e5dac9]">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-white border border-[#e5dac9] flex items-center justify-center">
              <img src="/logo-hcmus.png" alt="HCMUS" className="w-full h-full object-contain p-1" />
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
              (item.path === '/student/problems' && location.pathname.startsWith('/student/problem'));
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
                <span className={`flex-shrink-0 ${isActive ? 'text-[#193a2b]' : 'text-[#8a8073] group-hover:text-[#191919]'}`}>
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
            to="/student/profile"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#eadecc]/60 transition-colors"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#191919] truncate">{user?.fullName}</p>
                <p className="text-xs text-[#8a8073] truncate">{user?.role === 'instructor' ? t('breadcrumb.instructor') : t('breadcrumb.student')}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 flex-shrink-0 bg-[#f7f4eb]/80 backdrop-blur-xl border-b border-[#e5dac9] flex items-center px-4 lg:px-6 gap-3">
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
                {user?.role === 'instructor' ? t('breadcrumb.instructor') : t('breadcrumb.student')}
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
              <div className="absolute top-full mt-2 right-0 w-80 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl overflow-hidden z-[60] animate-slide-up">
                <p className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">{t('topbar.searchResults')}</p>
                {filteredProblems.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to={`/student/problem/${p.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--ws-hover)] text-[13px] text-[#191919]"
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-[60] animate-slide-up overflow-hidden">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">
                  {t('topbar.paletteTitle')}
                </p>
                <div className="p-2 max-h-80 overflow-y-auto">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setThemeId(t.id); setPaletteOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        theme.id === t.id ? 'bg-[var(--ws-accent-soft)]' : 'hover:bg-[var(--ws-hover)]'
                      }`}
                    >
                      <span className="flex -space-x-1.5 flex-shrink-0">
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
                      {theme.id === t.id && <Check size={15} className="text-[#193a2b] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#8a8073] hover:text-[#193a2b] hover:bg-[#eadecc]/60 transition-colors"
            title={dark ? t('topbar.themeToLight') : t('topbar.themeToDark')}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className={`p-2 rounded-lg transition-colors ${
                langOpen ? 'text-[#193a2b] bg-[#eadecc]/60' : 'text-[#8a8073] hover:text-[#193a2b] hover:bg-[#eadecc]/60'
              }`}
              title={t('topbar.language')}
            >
              <Languages size={18} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-[60] animate-slide-up overflow-hidden p-1.5">
                <button
                  onClick={() => { i18n.changeLanguage('vi'); setLangOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-colors ${
                    i18n.language === 'vi' ? 'bg-[var(--ws-accent-soft)] text-[#193a2b] font-semibold' : 'text-[#191919] hover:bg-[var(--ws-hover)]'
                  }`}
                >
                  <span className="w-6 h-4 flex items-center justify-center rounded-[3px] border border-[#e5dac9] text-[8px] font-bold bg-white text-[#8a8073]">
                    VN
                  </span>
                  {t('topbar.langVi')}
                  {i18n.language === 'vi' && <Check size={13} className="ml-auto text-[#193a2b]" />}
                </button>
                <button
                  onClick={() => { i18n.changeLanguage('en'); setLangOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-colors ${
                    i18n.language === 'en' ? 'bg-[var(--ws-accent-soft)] text-[#193a2b] font-semibold' : 'text-[#191919] hover:bg-[var(--ws-hover)]'
                  }`}
                >
                  <span className="w-6 h-4 flex items-center justify-center rounded-[3px] border border-[#e5dac9] text-[8px] font-bold bg-white text-[#8a8073]">
                    EN
                  </span>
                  {t('topbar.langEn')}
                  {i18n.language === 'en' && <Check size={13} className="ml-auto text-[#193a2b]" />}
                </button>
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#cc5a37] border-2 border-[#f7f4eb]" />
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-[60] animate-slide-up">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">{t('topbar.notifications')}</p>
                <div className="px-4 py-3 border-b border-[#e5dac9]/60 hover:bg-[var(--ws-hover)] cursor-pointer">
                  <p className="text-[13px] font-semibold text-[#191919]">{t('topbar.notifContestTitle')}</p>
                  <p className="text-[11px] text-[#8a8073] mt-0.5">
                    {t('topbar.notifContestMeta', {
                      count: contests.filter((c) => c.status === 'running').reduce((s, c) => s + c.participantCount, 0),
                    })}
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-[var(--ws-hover)] cursor-pointer">
                  <p className="text-[13px] font-semibold text-[#191919]">
                    {t('topbar.notifSubmissionPrefix', { id: submissions[0]?.id })} <span className="text-emerald-600">AC</span>
                  </p>
                  <p className="text-[11px] text-[#8a8073] mt-0.5">{t('topbar.notifSubmissionMeta')}</p>
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-sm font-bold">
                {user?.fullName?.charAt(0)}
              </div>
              <ChevronDown size={15} className={`text-[#8a8073] transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-[60] animate-slide-up overflow-hidden">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                    {user?.fullName?.charAt(0)}
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
                    to="/student/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-[var(--ws-hover)] transition-colors"
                  >
                    <User size={17} className="text-[#8a8073]" /> {t('userMenu.myProfile')}
                  </Link>
                  <Link
                    to="/student/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-[var(--ws-hover)] transition-colors"
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
          <main className="flex-1 p-6 overflow-y-auto">
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
