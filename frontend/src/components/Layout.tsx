import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProblemsQuery } from '../api/problems';
import { contests, submissions, type Contest } from '../data/mockData';
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

const studentItems: SidebarItem[] = [
  { label: 'Dashboard',       icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
  { label: 'Bài tập',         icon: <BookOpen size={20} />,       path: '/student/problems'  },
  { label: 'Bài tập về nhà',  icon: <ClipboardList size={20} />,  path: '/student/homework'  },
  { label: 'Kỳ thi',          icon: <Trophy size={20} />,         path: '/student/contest'   },
  { label: 'Nộp bài',         icon: <Send size={20} />,           path: '/student/submission' },
  { label: 'Lớp học',         icon: <GraduationCap size={20} />,  path: '/student/class'     },
];

const instructorItems: SidebarItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/instructor/dashboard' },
  { label: 'Lớp học', icon: <GraduationCap size={20} />, path: '/instructor/classes' },
  { label: 'Giao bài tập', icon: <ClipboardList size={20} />, path: '/instructor/homework' },
  { label: 'Kỳ thi', icon: <Trophy size={20} />, path: '/instructor/contest' },
  { label: 'Sinh viên', icon: <Users size={20} />, path: '/instructor/students' },
  { label: 'Ngân hàng bài tập', icon: <BookOpen size={20} />, path: '/instructor/problems' },
];

function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    student: 'Sinh viên',
    instructor: 'Giảng viên',
    dashboard: 'Dashboard',
    problems: 'Bài tập',
    problem: 'Làm bài',
    homework: 'Bài tập về nhà',
    contest: 'Kỳ thi',
    submission: 'Nộp bài',
    class: 'Lớp học',
    profile: 'Hồ sơ',
    settings: 'Cài đặt',
    students: 'Sinh viên',
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
  const { user, logout, isAuthenticated, isInitializing } = useAuth();
  const { dark, toggleTheme, theme, setThemeId, themes } = useTheme();
  const { data: problems = [] } = useProblemsQuery();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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
      if (e.key === 'Escape') { setSearchOpen(false); setBellOpen(false); setPaletteOpen(false); setAvatarOpen(false); }
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

  const items = user?.role === 'instructor' ? instructorItems : studentItems;
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
      {(bellOpen || paletteOpen || avatarOpen || searchOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setBellOpen(false); setPaletteOpen(false); setAvatarOpen(false); setSearchOpen(false); }}
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
            to="/student/profile"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#eadecc]/60 transition-colors"
          >
            <div className="shrink-0 w-9 h-9 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#191919] truncate">{user?.fullName}</p>
                <p className="text-xs text-[#8a8073] truncate">{user?.role === 'instructor' ? 'Giảng viên' : 'Sinh viên'}</p>
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
                {user?.role === 'instructor' ? 'Giảng viên' : 'Sinh viên'}
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
              placeholder="Tìm bài tập, người dùng…"
              className="w-48 lg:w-72 pl-9 pr-10 py-2 bg-[#f0ebd9] border border-[#e5dac9] rounded-lg text-[13px] text-[#191919] placeholder-[#bfae99] focus:outline-none focus:border-[#193a2b]"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-[#e5dac9] text-[#8a8073] font-mono">⌘K</kbd>
            {searchOpen && query && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl overflow-hidden z-60 animate-slide-up">
                <p className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">Kết quả</p>
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
                  <p className="px-4 py-3 text-[13px] text-[#8a8073]">Không tìm thấy bài nào.</p>
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
              title="Bảng màu"
            >
              <Palette size={18} />
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">
                  Bảng màu giao diện
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

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#8a8073] hover:text-[#193a2b] hover:bg-[#eadecc]/60 transition-colors"
            title={dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg text-[#8a8073] hover:text-[#191919] hover:bg-[#eadecc]/60 transition-colors"
              title="Thông báo"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#cc5a37] border-2 border-[#f7f4eb]" />
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up">
                <p className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8a8073] border-b border-[#e5dac9]">Thông báo</p>
                <div className="px-4 py-3 border-b border-[#e5dac9]/60 hover:bg-(--ws-hover) cursor-pointer">
                  <p className="text-[13px] font-semibold text-[#191919]">Kỳ thi "Luyện tập Đồ thị" đang diễn ra</p>
                  <p className="text-[11px] text-[#8a8073] mt-0.5">
                    5 phút trước • {contests.filter((c: Contest) => c.status === 'running').reduce((s: number, c: Contest) => s + c.participantCount, 0)} người tham gia
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-(--ws-hover) cursor-pointer">
                  <p className="text-[13px] font-semibold text-[#191919]">
                    Bài nộp {submissions[0]?.id} đã được chấm: <span className="text-emerald-600">AC</span>
                  </p>
                  <p className="text-[11px] text-[#8a8073] mt-0.5">1 giờ trước</p>
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
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-sm font-bold">
                {user?.fullName?.charAt(0)}
              </div>
              <ChevronDown size={15} className={`text-[#8a8073] transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl shadow-2xl z-60 animate-slide-up overflow-hidden">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#193a2b] to-[#2d5a3f] flex items-center justify-center text-white text-base font-bold shrink-0">
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-(--ws-hover) transition-colors"
                  >
                    <User size={17} className="text-[#8a8073]" /> Hồ sơ của tôi
                  </Link>
                  <Link
                    to="/student/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#5c5446] hover:bg-(--ws-hover) transition-colors"
                  >
                    <Settings size={17} className="text-[#8a8073]" /> Cài đặt
                  </Link>
                </div>

                {/* logout */}
                <div className="p-1.5 border-t border-[#e5dac9]/60">
                  <button
                    onClick={() => { setAvatarOpen(false); logout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-[#cc5a37] hover:bg-[#cc5a37]/10 transition-colors"
                  >
                    <LogOut size={17} /> Đăng xuất
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
