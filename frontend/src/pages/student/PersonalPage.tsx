import { useAuth } from '../../context/AuthContext';
import { useSubmissionsQuery } from '../../api/submissions';
import { useProblemsQuery } from '../../api/problems';
import { useMeQuery, useHeatmapQuery } from '../../api/users';
import {
  MapPin,
  Calendar,
  Award,
  Send,
  Trophy,
  TrendingUp,
  Flame,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

const VERDICT_LABELS: Record<string, string> = {
  ACCEPTED: 'Chấp nhận (AC)',
  WRONG_ANSWER: 'Sai kết quả (WA)',
  TIME_LIMIT_EXCEEDED: 'Quá thời gian (TLE)',
  RUNTIME_ERROR: 'Lỗi thực thi (RTE)',
  COMPILE_ERROR: 'Lỗi biên dịch (CE)',
  IN_QUEUE: 'Đang chờ chấm',
  PENDING: 'Đang chờ chấm',
};

const VERDICT_BAR_COLORS: Record<string, string> = {
  ACCEPTED: 'from-emerald-600 to-emerald-400',
  WRONG_ANSWER: 'from-red-600 to-red-400',
  TIME_LIMIT_EXCEEDED: 'from-yellow-500 to-yellow-400',
  RUNTIME_ERROR: 'from-orange-500 to-orange-400',
  COMPILE_ERROR: 'from-blue-500 to-blue-400',
  IN_QUEUE: 'from-gray-400 to-gray-300',
  PENDING: 'from-gray-400 to-gray-300',
};

const VERDICT_TEXT_COLORS: Record<string, string> = {
  ACCEPTED: 'text-emerald-700',
  WRONG_ANSWER: 'text-red-700',
  TIME_LIMIT_EXCEEDED: 'text-yellow-700',
  RUNTIME_ERROR: 'text-orange-700',
  COMPILE_ERROR: 'text-blue-700',
  IN_QUEUE: 'text-gray-600',
  PENDING: 'text-gray-600',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HARD: 'bg-red-100 text-red-800 border-red-200',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PersonalPage() {
  const { user } = useAuth();
  const { data: me } = useMeQuery();
  const { data: heatmap } = useHeatmapQuery();
  const { data: allSubmissions } = useSubmissionsQuery();
  const { data: allProblems } = useProblemsQuery();

  const mySubmissions = (allSubmissions ?? []).filter((s) => s.user_id === user?.id);
  const acSubmissions = mySubmissions.filter((s) => s.status === 'ACCEPTED');
  const solvedProblemIds = [...new Set(acSubmissions.map((s) => s.problem_id))];
  const solvedProblems = (allProblems ?? []).filter((p) => solvedProblemIds.includes(p.id));

  const verdictStats: Record<string, number> = {};
  for (const s of mySubmissions) {
    verdictStats[s.status] = (verdictStats[s.status] ?? 0) + 1;
  }

  const totalSubs = mySubmissions.length || 1;
  const rating = me?.elo_rating ?? 0;

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Profile Header */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-32 bg-linear-to-r from-[#193a2b]/20 via-[#e5dac9]/30 to-[#cc5a37]/20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <div className="w-24 h-24 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center text-white text-3xl font-bold font-serif border-4 border-white shadow-lg">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#191919] font-serif">{user?.fullName}</h2>
              <p className="text-[#8a8073] text-sm">@{user?.username}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#5c5446]">
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-[#8a8073]" /> {user?.institution}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} className="text-[#8a8073]" /> Tham gia {formatDate(me?.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl">
              <Trophy size={20} className="text-yellow-600" />
              <span className="text-xl font-bold text-yellow-600 font-serif">{rating}</span>
              <span className="text-xs text-yellow-700/60 font-medium">Rating</span>
            </div>
          </div>
          {user?.bio && <p className="mt-4 text-[#5c5446] text-sm leading-relaxed">{user.bio}</p>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <CheckCircle2 size={24} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{solvedProblemIds.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài đã giải</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <Send size={24} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{mySubmissions.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Lượt nộp</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <Award size={24} className="text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">{rating}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Rating</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 text-center shadow-sm">
          <TrendingUp size={24} className="text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-[#191919]">
            {mySubmissions.length ? Math.round((acSubmissions.length / mySubmissions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ AC</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Streak & hoạt động (dữ liệu thật từ /users/me/heatmap) */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <Flame size={20} className="text-orange-600" /> Streak hoạt động
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#f7f4eb]/60 border border-[#e5dac9] text-center">
              <p className="text-2xl font-bold font-serif text-[#193a2b]">{heatmap?.current_streak ?? 0}</p>
              <p className="text-xs text-[#8a8073] mt-1">Chuỗi ngày hiện tại</p>
            </div>
            <div className="p-4 rounded-lg bg-[#f7f4eb]/60 border border-[#e5dac9] text-center">
              <p className="text-2xl font-bold font-serif text-[#193a2b]">{heatmap?.highest_streak ?? 0}</p>
              <p className="text-xs text-[#8a8073] mt-1">Chuỗi dài nhất</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#8a8073]">
            Hoạt động gần nhất: {formatDate(heatmap?.last_active_date)}
          </p>
        </div>

        {/* Verdict Distribution */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-600" /> Phân bố kết quả
          </h3>
          {Object.keys(verdictStats).length === 0 ? (
            <p className="text-sm text-[#8a8073]">Chưa có lượt nộp bài nào.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(verdictStats).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-32 shrink-0 ${VERDICT_TEXT_COLORS[status] ?? 'text-[#5c5446]'}`}>
                    {VERDICT_LABELS[status] ?? status}
                  </span>
                  <div className="flex-1 bg-[#f0ebd9] rounded-full h-3">
                    <div
                      className={`bg-linear-to-r ${VERDICT_BAR_COLORS[status] ?? 'from-gray-400 to-gray-300'} h-3 rounded-full transition-all`}
                      style={{ width: `${(count / totalSubs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#5c5446] w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Solved Problems */}
      <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">Bài đã giải</h3>
        <div className="flex flex-wrap gap-2">
          {solvedProblems.map((p) => (
            <span
              key={p.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${DIFFICULTY_COLORS[p.difficulty] ?? ''}`}
            >
              {p.title} · {DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty}
            </span>
          ))}
          {solvedProblems.length === 0 && (
            <p className="text-sm text-[#8a8073]">Chưa giải bài nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
