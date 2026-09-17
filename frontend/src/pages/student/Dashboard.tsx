import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, Loader2, Send, Target, Trophy, Clock, Award } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery, useLeaderboardQuery, type LeaderboardEntryDto } from '../../api/contests';
import { useSubmissionsQuery } from '../../api/submissions';
import { useAuth } from '../../context/AuthContext';
import { formatVN, formatVNFull } from '../../utils/dateTime';
import UpcomingContestCountdown from '../../components/UpcomingContestCountdown';
import TopRatedLeaderboard from '../../components/TopRatedLeaderboard';

const verdictColors: Record<string, string> = {
  AC: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  WA: 'text-red-700 bg-red-50 border-red-300',
  TLE: 'text-amber-700 bg-amber-50 border-amber-300',
  MLE: 'text-amber-700 bg-amber-50 border-amber-300',
  RTE: 'text-orange-700 bg-orange-50 border-orange-300',
  CE: 'text-blue-700 bg-blue-50 border-blue-300',
  PE: 'text-pink-700 bg-pink-50 border-pink-300',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: contests, isLoading: contestsLoading, error: contestsError } = useContestsQuery();
  const activeContest = useMemo(
    () => contests?.find((contest) => contest.status === 'running') ?? contests?.[0],
    [contests]
  );
  const activeContestId = activeContest?.id;
  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useLeaderboardQuery(activeContestId);
  const { data: submissions, isLoading: submissionsLoading, error: submissionsError } = useSubmissionsQuery();

  const leaderboardRows: LeaderboardEntryDto[] = (leaderboard ?? []) as LeaderboardEntryDto[];

  const runningContests = (contests ?? []).filter((contest) => contest.status === 'running');
  const upcomingContests = (contests ?? []).filter((contest) => contest.status === 'upcoming');
  const STATUS_MAP: Record<string, string> = {
    ACCEPTED: 'AC',
    WRONG_ANSWER: 'WA',
    TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE',
    COMPILE_ERROR: 'CE',
    RUNTIME_ERROR: 'RTE',
    PENDING: 'PENDING',
    IN_QUEUE: 'PENDING',
    JUDGING: 'JUDGING',
  };
  const recentSubmissions = (submissions ?? []).slice(0, 5).map((submission) => ({
    id: submission.id,
    problemTitle: submission.problem_title,
    language: submission.language,
    verdict: STATUS_MAP[submission.status] ?? submission.status,
    timestamp: submission.created_at,
    executionTime: submission.execution_time,
    memory: submission.memory_used,
  }));
  const solvedCount = new Set(
    (submissions ?? [])
      .filter((submission) => submission.status === 'ACCEPTED')
      .map((submission) => submission.problem_id)
  ).size;
  const submissionCount = submissions?.length ?? 0;
  const acceptedCount = (submissions ?? []).filter((submission) => submission.status === 'ACCEPTED').length;
  const successRate = submissionCount ? Math.round((acceptedCount / submissionCount) * 100) : 0;

  if (contestsError instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-xs">
        <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#191919] font-serif">Không thể tải dashboard</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{contestsError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Welcome Banner */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191919] font-serif">
            Xin chào, {user?.fullName || user?.email}! 👋
          </h2>
          <p className="text-sm text-[#5c5446] mt-1">
            Theo dõi tiến độ học tập, bài tập, kỳ thi và thứ hạng lập trình của bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/student/problem"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#193a2b] text-white text-sm font-semibold hover:bg-[#143022] transition-colors shadow-xs"
          >
            Luyện tập bài toán
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Upcoming Contest Reminder with Live Countdown Timer */}
      <UpcomingContestCountdown contests={contests ?? []} userRole="student" />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#193a2b]/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#193a2b]" />
            </div>
            <span className="text-xs font-semibold text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-md">
              Mục tiêu
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{solvedCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài đã giải (AC)</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Send size={20} className="text-emerald-700" />
            </div>
            <span className="text-xs font-semibold text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-md">
              Submissions
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{submissionCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tổng lượt nộp bài</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-amber-700" />
            </div>
            {runningContests.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{runningContests.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Kỳ thi đang diễn ra</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#f0ebd9] rounded-lg flex items-center justify-center">
              <Target size={20} className="text-[#193a2b]" />
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {acceptedCount} AC
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{successRate}%</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ nộp chính xác</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Contests & Recent Submissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contests Section */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#191919] font-serif">Kỳ thi đang & sắp diễn ra</h3>
                <p className="text-xs text-[#8a8073]">Các kỳ thi trực tuyến trên hệ thống JudgeHub</p>
              </div>
              <Link to="/student/contest" className="text-xs text-[#193a2b] hover:text-[#2d5a3f] font-semibold flex items-center gap-1">
                Xem tất cả <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {[...runningContests, ...upcomingContests].slice(0, 4).map((contest) => (
                <Link
                  key={contest.id}
                  to={`/student/contest/${contest.id}`}
                  className="w-full flex items-center gap-4 p-3.5 bg-[#fbf9f4] rounded-xl border border-[#e5dac9] hover:border-[#193a2b]/40 hover:bg-[#f0ebd9]/30 transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    contest.status === 'running' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Trophy size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191919] group-hover:text-[#193a2b] transition-colors truncate">
                      {contest.title}
                    </p>
                    <p className="text-xs text-[#8a8073] flex items-center gap-1.5 mt-1">
                      <Calendar size={12} /> {contest.startTime ? formatVN(contest.startTime) : '-'}
                      {contest.endTime && (
                        <span>• Hạn chót: {formatVN(contest.endTime)}</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold flex-shrink-0 ${
                    contest.status === 'running'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {contest.status === 'running' ? 'Đang diễn ra' : 'Sắp tới'}
                  </span>
                </Link>
              ))}

              {contestsLoading && (
                <div className="flex items-center justify-center py-6 text-sm text-[#8a8073]">
                  <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải kỳ thi...
                </div>
              )}

              {!contestsLoading && runningContests.length === 0 && upcomingContests.length === 0 && (
                <div className="py-8 text-center border border-dashed border-[#e5dac9] rounded-xl">
                  <Trophy size={28} className="text-[#bfae99] mx-auto mb-2" />
                  <p className="text-sm text-[#8a8073]">Hiện không có kỳ thi nào đang mở hoặc sắp tới.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions Section */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#191919] font-serif">Bài nộp gần đây</h3>
                <p className="text-xs text-[#8a8073]">Nhật ký nộp mã nguồn gần nhất của bạn</p>
              </div>
            </div>

            {submissionsLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-[#8a8073]">
                <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải bài nộp...
              </div>
            ) : submissionsError ? (
              <div className="rounded-xl border border-dashed border-[#e5dac9] p-6 text-center text-sm text-[#8a8073]">
                Không thể tải dữ liệu bài nộp.
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5dac9] p-6 text-center text-sm text-[#8a8073]">
                Chưa có bài nộp nào. Hãy thử giải một bài toán ngay hôm nay!
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-[#fbf9f4] rounded-xl border border-[#e5dac9] hover:border-[#193a2b]/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-bold font-mono border ${verdictColors[sub.verdict] || 'bg-slate-100 text-slate-800'}`}>
                        {sub.verdict}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-[#191919] font-semibold truncate">{sub.problemTitle}</p>
                        <p className="text-xs text-[#8a8073] mt-0.5">
                          {sub.language} • {formatVNFull(sub.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#8a8073] flex-shrink-0 pl-3">
                      <p className="font-mono">{sub.executionTime !== null && sub.executionTime !== undefined ? `${sub.executionTime}ms` : '—'}</p>
                      <p className="font-mono">{sub.memory !== null && sub.memory !== undefined ? `${sub.memory}MB` : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Top Rated Leaderboard & Active Contest Standing */}
        <div className="space-y-6">
          {/* Top Rated Leaderboard Component */}
          <TopRatedLeaderboard maxItems={5} showTitle={true} />

          {/* Active Contest Mini Leaderboard (if active) */}
          {activeContest && leaderboardRows.length > 0 && (
            <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e5dac9]">
                <div>
                  <h4 className="text-sm font-bold text-[#191919] font-serif">BXH Kỳ thi hiện tại</h4>
                  <p className="text-[11px] text-[#8a8073] truncate max-w-[200px]">{activeContest.title}</p>
                </div>
                <Link to={`/student/contest/${activeContest.id}`} className="text-xs text-[#193a2b] font-semibold hover:underline">
                  Chi tiết
                </Link>
              </div>

              <div className="space-y-2">
                {leaderboardRows.slice(0, 4).map((entry) => (
                  <div key={`${entry.rank}-${entry.username}`} className="flex items-center justify-between p-2 rounded-lg bg-[#fbf9f4] border border-[#f0ebd9]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#f0ebd9] text-[#191919] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {entry.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#191919] truncate">{entry.fullName}</p>
                        <p className="text-[10px] text-[#8a8073]">@{entry.username}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{entry.solvedCount} AC</p>
                      <p className="text-[10px] text-[#8a8073]">{entry.rating} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
