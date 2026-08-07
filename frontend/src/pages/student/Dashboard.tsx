import { useAuth } from '../../context/AuthContext';
import {
  Trophy,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Target,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { problems, submissions, contests, homeworks, leaderboardData, activityData } from '../../data/mockData';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();

  const mySubmissions = submissions.filter((s) => s.userId === user?.id);
  const acCount = mySubmissions.filter((s) => s.verdict === 'AC').length;
  const waCount = mySubmissions.filter((s) => s.verdict === 'WA').length;
  const runningContests = contests.filter((c) => c.status === 'running');
  const upcomingContests = contests.filter((c) => c.status === 'upcoming');
  const activeHomeworks = homeworks.filter((h) => h.status === 'active');

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-700 bg-emerald-100 border-emerald-300',
    WA: 'text-red-700 bg-red-100 border-red-300',
    TLE: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    MLE: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    RTE: 'text-orange-700 bg-orange-100 border-orange-300',
    CE: 'text-blue-700 bg-blue-100 border-blue-300',
    PE: 'text-pink-700 bg-pink-100 border-pink-300',
  };

  const diffColors: Record<string, string> = {
    Easy: 'text-emerald-700 bg-emerald-100/50',
    Medium: 'text-yellow-700 bg-yellow-100/50',
    Hard: 'text-red-700 bg-red-100/50',
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#193a2b]/10 via-[#e5dac9]/20 to-[#cc5a37]/10 border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[#191919] font-serif mb-1">
          Xin chào, {user?.fullName}! 👋
        </h2>
        <p className="text-[#5c5446] text-sm">
          Hãy tiếp tục rèn luyện kỹ năng giải quyết bài toán và lập trình sáng tạo ngày hôm nay.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#193a2b]/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#193a2b]" />
            </div>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{user?.solvedCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài đã giải</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Send size={20} className="text-emerald-700" />
            </div>
            <Zap size={16} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{user?.submissionCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Lượt nộp</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#cc5a37]/10 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-[#cc5a37]" />
            </div>
            <Target size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{user?.rating}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Rating</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-amber-700" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">
            {user?.submissionCount ? Math.round((acCount / mySubmissions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ AC</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">Hoạt động gần đây</h3>
          <div className="flex items-end gap-2 h-32">
            {activityData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-[#193a2b] to-[#2d5a3f] rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${Math.max(d.count * 24, 4)}px` }}
                  title={`${d.date}: ${d.count} bài nộp`}
                />
                <span className="text-[10px] text-[#8a8073]">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">Thống kê nộp bài</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[#5c5446]">
                <CheckCircle2 size={14} className="text-emerald-600" /> Accepted
              </span>
              <span className="text-sm font-semibold text-emerald-600">{acCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[#5c5446]">
                <XCircle size={14} className="text-red-600" /> Wrong Answer
              </span>
              <span className="text-sm font-semibold text-red-600">{waCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[#5c5446]">
                <Clock size={14} className="text-yellow-600" /> Time Limit
              </span>
              <span className="text-sm font-semibold text-yellow-600">
                {mySubmissions.filter((s) => s.verdict === 'TLE').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[#5c5446]">
                <XCircle size={14} className="text-orange-600" /> Runtime Error
              </span>
              <span className="text-sm font-semibold text-orange-600">
                {mySubmissions.filter((s) => s.verdict === 'RTE').length}
              </span>
            </div>
            <div className="w-full bg-[#f0ebd9] rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-[#193a2b] to-emerald-500 h-2 rounded-full"
                style={{ width: `${mySubmissions.length ? (acCount / mySubmissions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Contests & Homeworks */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Kỳ thi sắp tới</h3>
            <Link to="/student/contest" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {[...runningContests, ...upcomingContests].slice(0, 3).map((contest) => (
              <div key={contest.id} className="flex items-center gap-4 p-3 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]/50 hover:border-[#193a2b]/30 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  contest.status === 'running' ? 'bg-emerald-100' : 'bg-yellow-100'
                }`}>
                  <Trophy size={20} className={contest.status === 'running' ? 'text-emerald-700' : 'text-yellow-700'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#191919] truncate">{contest.title}</p>
                  <p className="text-xs text-[#8a8073] flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> {contest.startTime}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  contest.status === 'running'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}>
                  {contest.status === 'running' ? 'Đang diễn ra' : 'Sắp tới'}
                </span>
              </div>
            ))}
            {runningContests.length === 0 && upcomingContests.length === 0 && (
              <p className="text-sm text-[#8a8073] text-center py-4">Không có kỳ thi nào</p>
            )}
          </div>
        </div>

        {/* Active Homeworks */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Bài tập đang mở</h3>
            <Link to="/student/homework" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {activeHomeworks.map((hw) => (
              <div key={hw.id} className="p-3 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]/50 hover:border-[#193a2b]/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#191919]">{hw.title}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">
                    Đang mở
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8a8073]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Hạn: {hw.deadline}
                  </span>
                  <span>{hw.completedCount}/{hw.problemCount} bài</span>
                </div>
                <div className="w-full bg-[#f0ebd9] rounded-full h-1.5 mt-2">
                  <div
                    className="bg-gradient-to-r from-[#193a2b] to-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${(hw.completedCount / hw.problemCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#191919] font-serif">Bài nộp gần đây</h3>
            <Link to="/student/submission" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {mySubmissions.slice(0, 5).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-[#f7f4eb]/50 rounded-lg border border-[#e5dac9]/50">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-md font-bold border ${verdictColors[sub.verdict]}`}>
                    {sub.verdict}
                  </span>
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
        </div>

        {/* Problems to try */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">Bài tập gợi ý</h3>
          <div className="space-y-2">
            {problems.slice(0, 6).map((problem) => (
              <Link key={problem.id} to={`/student/problem/${problem.id}`} className="flex items-center justify-between p-3 bg-[#f7f4eb]/50 rounded-lg border border-[#e5dac9]/50 hover:border-[#193a2b]/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${diffColors[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                  <div>
                    <p className="text-sm text-[#191919] font-medium">{problem.title}</p>
                    <p className="text-xs text-[#8a8073] mt-0.5">{problem.category} • {problem.points} điểm</p>
                  </div>
                </div>
                <div className="text-right text-xs text-[#8a8073]">
                  <p>{problem.solvedCount} đã giải</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#191919] font-serif mb-4">Bảng xếp hạng</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dac9]">
                <th className="text-left text-xs font-medium text-[#8a8073] pb-3 pr-4">#</th>
                <th className="text-left text-xs font-medium text-[#8a8073] pb-3 pr-4">Người dùng</th>
                <th className="text-right text-xs font-medium text-[#8a8073] pb-3 pr-4">Bài đã giải</th>
                <th className="text-right text-xs font-medium text-[#8a8073] pb-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.slice(0, 5).map((entry) => (
                <tr key={entry.rank} className="border-b border-[#e5dac9]/50 hover:bg-[#f7f4eb]/50">
                  <td className="py-3 pr-4">
                    <span className={`text-sm font-bold ${
                      entry.rank === 1 ? 'text-yellow-600' : entry.rank === 2 ? 'text-slate-400' : entry.rank === 3 ? 'text-amber-700' : 'text-slate-400'
                    }`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {entry.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-[#191919] font-medium">{entry.fullName}</p>
                        <p className="text-xs text-[#8a8073]">@{entry.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm text-emerald-600 font-medium">{entry.solvedCount}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-blue-600 font-medium">{entry.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
