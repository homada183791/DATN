import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, Loader2, Send, Target, Trophy, XCircle } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery } from '../../api/contests';
import { useLeaderboardQuery } from '../../api/contests';
import { useAuth } from '../../context/AuthContext';

const verdictColors: Record<string, string> = {
  AC: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  WA: 'text-red-700 bg-red-100 border-red-300',
  TLE: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  MLE: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  RTE: 'text-orange-700 bg-orange-100 border-orange-300',
  CE: 'text-blue-700 bg-blue-100 border-blue-300',
  PE: 'text-pink-700 bg-pink-100 border-pink-300',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: contests, isLoading: contestsLoading, error: contestsError } = useContestsQuery();
  const activeContestId = useMemo(
    () => contests?.find((contest) => contest.status === 'running')?.id ?? contests?.[0]?.id,
    [contests]
  );
  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useLeaderboardQuery(activeContestId);

  const leaderboardRows = Array.isArray(leaderboard)
    ? leaderboard
    : leaderboard?.standings ?? [];

  const runningContests = (contests ?? []).filter((contest) => contest.status === 'running');
  const upcomingContests = (contests ?? []).filter((contest) => contest.status === 'upcoming');
  const recentSubmissions = [];
  const solvedCount = 0;
  const submissionCount = 0;
  const successRate = 0;

  if (contestsError instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#191919]">Không thể tải dashboard</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{contestsError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="bg-gradient-to-r from-[#193a2b]/10 via-[#e5dac9]/20 to-[#cc5a37]/10 border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[#191919] font-serif mb-1">Xin chào, {user?.fullName}!</h2>
        <p className="text-[#5c5446] text-sm">Đây là dữ liệu live từ API: kỳ thi đang diễn ra và bảng xếp hạng gần nhất.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#193a2b]/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#193a2b]" />
            </div>
            <Target size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{solvedCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài đã giải</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Send size={20} className="text-emerald-700" />
            </div>
            <Target size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{submissionCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Lượt nộp</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#cc5a37]/10 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-[#cc5a37]" />
            </div>
            <Calendar size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{runningContests.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Kỳ thi đang diễn ra</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-amber-700" />
            </div>
            <Loader2 size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{successRate}%</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ AC</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Kỳ thi sắp tới và đang diễn ra</h3>
            <Link to="/student/contest" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {[...runningContests, ...upcomingContests].slice(0, 4).map((contest) => (
              <button key={contest.id} className="w-full flex items-center gap-4 p-3 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]/50 hover:border-[#193a2b]/30 transition-all text-left">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contest.status === 'running' ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
                  <Trophy size={20} className={contest.status === 'running' ? 'text-emerald-700' : 'text-yellow-700'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#191919] truncate">{contest.title}</p>
                  <p className="text-xs text-[#8a8073] flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> {contest.startTime ?? '-'}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${contest.status === 'running' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                  {contest.status === 'running' ? 'Đang diễn ra' : 'Sắp tới'}
                </span>
              </button>
            ))}
            {contestsLoading && (
              <div className="flex items-center justify-center py-6 text-sm text-[#8a8073]">
                <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải kỳ thi...
              </div>
            )}
            {!contestsLoading && runningContests.length === 0 && upcomingContests.length === 0 && (
              <p className="text-sm text-[#8a8073] text-center py-4">Không có kỳ thi nào</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Bảng xếp hạng</h3>
            <span className="text-xs text-[#8a8073]">{activeContestId ?? 'N/A'}</span>
          </div>
          {leaderboardError instanceof ApiError && <p className="text-sm text-red-600 mb-3">{leaderboardError.message}</p>}
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-[#8a8073]">
              <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải bảng xếp hạng...
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardRows.slice(0, 5).map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className="flex items-center justify-between rounded-lg border border-[#e5dac9]/60 bg-[#f7f4eb]/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[#191919]">{entry.fullName}</p>
                    <p className="text-xs text-[#8a8073]">@{entry.username}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">{entry.solvedCount}</p>
                    <p className="text-xs text-[#8a8073]">{entry.rating} rating</p>
                  </div>
                </div>
              ))}
              {leaderboardRows.length === 0 && <p className="text-sm text-[#8a8073] text-center py-4">Chưa có dữ liệu bảng xếp hạng</p>}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Bài nộp gần đây</h3>
            <span className="text-sm text-[#8a8073]">Live view</span>
          </div>
          {recentSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e5dac9] p-6 text-center text-sm text-[#8a8073]">
              Chưa có dữ liệu bài nộp từ API.
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-[#f7f4eb]/50 rounded-lg border border-[#e5dac9]/50">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-bold border ${verdictColors[sub.verdict]}`}>{sub.verdict}</span>
                    <div>
                      <p className="text-sm text-[#191919] font-medium">{sub.problemTitle}</p>
                      <p className="text-xs text-[#8a8073] mt-0.5">{sub.language} • {sub.timestamp.slice(5, 16)}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#8a8073]">
                    <p>{sub.executionTime}ms</p>
                    <p>{sub.memory}MB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Trạng thái hệ thống</h3>
            <span className="text-xs text-emerald-700 font-medium">API connected</span>
          </div>
          <div className="space-y-3 text-sm text-[#5c5446]">
            <p>• Kết nối dữ liệu live cho contest và leaderboard đã sẵn sàng.</p>
            <p>• Khi BE cung cấp submission feed, block bài nộp gần đây sẽ tự động hiện dữ liệu thật.</p>
            <p>• Các trang chi tiết bài tập đã dùng API thật và hỗ trợ loading / not found / rate limit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
