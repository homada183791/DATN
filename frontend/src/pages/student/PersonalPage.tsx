import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/http';
import {
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Send,
  Trophy,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Users,
  GraduationCap,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface SolvedProblem {
  id: string;
  title: string;
  difficulty: string;
}

interface UserStatsData {
  total_submissions: number;
  solved_count: number;
  ac_rate: number;
  verdict_stats: Record<string, number>;
  solved_problems: SolvedProblem[];
  instructor_stats?: {
    classes_count: number;
    contests_count: number;
    total_students_count: number;
  } | null;
}

export default function PersonalPage() {
  const { user, refreshProfile } = useAuth();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    refreshProfile?.();

    apiFetch<UserStatsData>('/api/v1/users/me/stats')
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch((err) => {
        console.error('Không thể tải thống kê người dùng:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const verdictStats = stats?.verdict_stats || {
    AC: 0,
    WA: 0,
    TLE: 0,
    MLE: 0,
    RTE: 0,
    CE: 0,
  };

  const totalSubs = stats?.total_submissions || 0;
  const isInstructor = user?.role === 'instructor';

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Profile Header */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#193a2b]/20 via-[#e5dac9]/30 to-[#cc5a37]/20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <div className="w-24 h-24 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white text-3xl font-bold font-serif border-4 border-white shadow-lg overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-[#191919] font-serif">
                  {user?.fullName || user?.username}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isInstructor ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isInstructor ? 'Giảng viên' : 'Sinh viên'}
                </span>
              </div>

              <p className="text-[#8a8073] text-sm mt-0.5">@{user?.username}</p>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[#5c5446]">
                {user?.institution && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-[#8a8073]" /> {user.institution}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-[#8a8073]" /> Tham gia {user?.joinDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl shadow-xs">
              <Trophy size={20} className="text-yellow-600" />
              <span className="text-xl font-bold text-yellow-600 font-serif">
                {user?.rating ?? 1200}
              </span>
              <span className="text-xs text-yellow-700/70 font-medium">Rating ELO</span>
            </div>
          </div>

          {user?.bio && (
            <p className="mt-4 text-[#5c5446] text-sm leading-relaxed p-3 bg-[#f7f4eb]/60 rounded-xl border border-[#e5dac9]/60">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white border border-[#e5dac9] rounded-xl shadow-sm">
          <Loader2 className="animate-spin text-[#193a2b]" size={28} />
          <span className="ml-3 text-sm text-[#5c5446]">Đang tải thống kê thực tế...</span>
        </div>
      ) : (
        <>
          {/* Nếu là Giảng viên: Hiển thị Khối quản lý giảng dạy */}
          {isInstructor && stats?.instructor_stats && (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
                <GraduationCap size={20} className="text-[#193a2b]" /> Hoạt động giảng dạy
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#f7f4eb]/60 rounded-xl border border-[#e5dac9] text-center">
                  <BookOpen size={22} className="text-[#193a2b] mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-[#191919]">{stats.instructor_stats.classes_count}</p>
                  <p className="text-xs text-[#8a8073]">Lớp học đang phụ trách</p>
                </div>
                <div className="p-4 bg-[#f7f4eb]/60 rounded-xl border border-[#e5dac9] text-center">
                  <Users size={22} className="text-blue-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-[#191919]">{stats.instructor_stats.total_students_count}</p>
                  <p className="text-xs text-[#8a8073]">Sinh viên theo học</p>
                </div>
                <div className="p-4 bg-[#f7f4eb]/60 rounded-xl border border-[#e5dac9] text-center">
                  <Trophy size={22} className="text-yellow-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-[#191919]">{stats.instructor_stats.contests_count}</p>
                  <p className="text-xs text-[#8a8073]">Kỳ thi đã tổ chức</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
              <CheckCircle2 size={24} className="text-[#193a2b] mx-auto mb-2" />
              <p className="text-2xl font-bold font-serif text-[#191919]">{stats?.solved_count || 0}</p>
              <p className="text-xs text-[#8a8073] mt-0.5">Bài đã giải</p>
            </div>
            <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
              <Send size={24} className="text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold font-serif text-[#191919]">{stats?.total_submissions || 0}</p>
              <p className="text-xs text-[#8a8073] mt-0.5">Lượt nộp bài</p>
            </div>
            <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
              <Award size={24} className="text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold font-serif text-[#191919]">{user?.rating ?? 1200}</p>
              <p className="text-xs text-[#8a8073] mt-0.5">Rating ELO</p>
            </div>
            <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
              <TrendingUp size={24} className="text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold font-serif text-[#191919]">{stats?.ac_rate || 0}%</p>
              <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ nộp AC</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Verdict Distribution (Thực tế) */}
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-600" /> Phân bố kết quả nộp bài
              </h3>

              {totalSubs === 0 ? (
                <div className="text-center py-8 text-[#8a8073] text-sm">
                  <HelpCircle size={28} className="mx-auto mb-2 opacity-50" />
                  Chưa có bài nộp nào được ghi nhận.
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { verdict: 'AC', label: 'Accepted', color: 'bg-emerald-500', text: 'text-emerald-700' },
                    { verdict: 'WA', label: 'Wrong Answer', color: 'bg-red-500', text: 'text-red-700' },
                    { verdict: 'TLE', label: 'Time Limit Exceeded', color: 'bg-yellow-500', text: 'text-yellow-700' },
                    { verdict: 'RTE', label: 'Runtime Error', color: 'bg-orange-500', text: 'text-orange-700' },
                    { verdict: 'CE', label: 'Compile Error', color: 'bg-blue-500', text: 'text-blue-700' },
                  ].map((item) => {
                    const count = verdictStats[item.verdict] || 0;
                    const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                    return (
                      <div key={item.verdict} className="flex items-center gap-3">
                        <span className={`text-xs font-bold font-mono w-9 ${item.text}`}>{item.verdict}</span>
                        <div className="flex-1 bg-[#f0ebd9] rounded-full h-3 overflow-hidden">
                          <div
                            className={`${item.color} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#5c5446] w-12 text-right">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Solved Problems List (Thực tế) */}
            <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center justify-between">
                <span>Bài tập đã giải</span>
                <span className="text-xs px-2 py-0.5 bg-[#193a2b]/10 text-[#193a2b] font-semibold rounded-full">
                  {stats?.solved_problems.length || 0} bài
                </span>
              </h3>

              {!stats?.solved_problems || stats.solved_problems.length === 0 ? (
                <div className="text-center py-8 text-[#8a8073] text-sm">
                  <HelpCircle size={28} className="mx-auto mb-2 opacity-50" />
                  Bạn chưa vượt qua bài tập nào. Hãy nộp bài để tích luỹ thành tích!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                  {stats.solved_problems.map((p) => {
                    const diffColors: Record<string, string> = {
                      EASY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
                      HARD: 'bg-red-100 text-red-800 border-red-200',
                    };
                    return (
                      <span
                        key={p.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${diffColors[p.difficulty] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                      >
                        {p.title}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
