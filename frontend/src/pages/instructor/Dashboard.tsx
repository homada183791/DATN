import { useAuth } from '../../context/AuthContext';
import {
  Users,
  BookOpen,
  Trophy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  BarChart3,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
import { useSubmissionsQuery } from '../../api/submissions';
import { useContestsQuery } from '../../api/contests';
import { formatVNFull } from '../../utils/dateTime';
import UpcomingContestCountdown from '../../components/UpcomingContestCountdown';
import TopRatedLeaderboard from '../../components/TopRatedLeaderboard';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { myClasses } = useClass();
  const { allHomeworks } = useHomework();
  const { data: submissionData = [] } = useSubmissionsQuery();
  const { data: contests = [] } = useContestsQuery();

  const verdictFromStatus: Record<string, string> = {
    ACCEPTED: 'AC',
    WRONG_ANSWER: 'WA',
    TIME_LIMIT_EXCEEDED: 'TLE',
    COMPILE_ERROR: 'CE',
    RUNTIME_ERROR: 'RTE',
    PENDING: 'PENDING',
    IN_QUEUE: 'PENDING',
  };

  const submissions = submissionData.map((submission) => ({
    ...submission,
    verdict: verdictFromStatus[submission.status] ?? 'PENDING',
    executionTime: submission.execution_time ?? 0,
    timestamp: submission.created_at,
    problemTitle: submission.problem_title,
  }));

  const totalStudents = myClasses.reduce((sum, c) => sum + c.studentCount, 0);
  const activeHomeworks = allHomeworks.filter((h) => h.status === 'active').length;
  const runningContests = contests.filter((contest) => contest.status === 'running').length;
  const totalSubmissions = submissions.length;
  const acRate = totalSubmissions === 0
    ? 0
    : Math.round((submissions.filter((s) => s.verdict === 'AC').length / totalSubmissions) * 100);

  const recentSubmissions = submissions.slice(0, 5);

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    WA: 'text-red-800 bg-red-50 border-red-300',
    TLE: 'text-amber-800 bg-amber-50 border-amber-300',
    MLE: 'text-amber-800 bg-amber-50 border-amber-300',
    RTE: 'text-orange-800 bg-orange-50 border-orange-300',
    CE: 'text-blue-800 bg-blue-50 border-blue-300',
    PE: 'text-pink-800 bg-pink-50 border-pink-300',
    PENDING: 'text-slate-800 bg-slate-50 border-slate-300',
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Welcome Banner */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">
            Xin chào, {user?.fullName || user?.email}! 👨‍🏫
          </h2>
          <p className="text-[#5c5446] text-sm mt-1">
            Quản lý học thuật, theo dõi tiến độ nộp bài và giám sát kỳ thi trực tuyến của sinh viên.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/instructor/classes"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#193a2b] text-white text-sm font-semibold hover:bg-[#143022] transition-colors shadow-xs"
          >
            <Plus size={16} />
            Quản lý lớp học
          </Link>
        </div>
      </div>

      {/* Upcoming Contest Reminder with Live Countdown */}
      <UpcomingContestCountdown contests={contests} userRole="instructor" />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-purple-700" />
            </div>
            <span className="text-xs font-semibold text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-md">
              Học viên
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{totalStudents}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tổng số sinh viên</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#193a2b]/10 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-[#193a2b]" />
            </div>
            <span className="text-xs font-semibold text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-md">
              Đang mở
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{activeHomeworks}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài tập đang giao</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-amber-700" />
            </div>
            {runningContests > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{runningContests}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Kỳ thi đang diễn ra</p>
        </div>

        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 shadow-xs hover:border-[#193a2b]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-700" />
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {totalSubmissions} nộp
            </span>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{acRate}%</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ AC toàn trường</p>
        </div>
      </div>

      {/* Main Grid: Left (Classes & Submissions) & Right (Top Rated & Deadlines) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Classes Overview */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-[#191919]">Lớp học phụ trách</h3>
                <p className="text-xs text-[#8a8073]">Bấm vào lớp học để quản lý bài tập và thành viên</p>
              </div>
              <Link to="/instructor/classes" className="text-xs text-[#193a2b] hover:text-[#2d5a3f] font-semibold flex items-center gap-1">
                Tất cả lớp học <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {myClasses.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/instructor/class/${cls.id}`}
                  className="block p-4 bg-[#fbf9f4] rounded-xl border border-[#e5dac9] hover:border-[#193a2b]/40 hover:bg-[#f0ebd9]/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-[#193a2b] text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                        <GraduationCap size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#191919] group-hover:text-[#193a2b] transition-colors truncate">
                          {cls.name}
                        </p>
                        <p className="text-xs text-[#8a8073] mt-0.5">
                          {cls.code}{cls.semester ? ` • ${cls.semester}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#5c5446] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#e5dac9] flex-shrink-0">
                      {cls.studentCount} SV
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#8a8073] mt-3 pt-2.5 border-t border-[#e5dac9]/60">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {cls.homeworkCount} bài tập
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={12} /> {cls.contestCount} kỳ thi
                    </span>
                  </div>
                </Link>
              ))}

              {myClasses.length === 0 && (
                <div className="sm:col-span-2 py-8 text-center border border-dashed border-[#e5dac9] rounded-xl">
                  <p className="text-sm text-[#8a8073]">Chưa có lớp học nào. Hãy tạo lớp học mới để bắt đầu.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-[#191919]">Bài nộp sinh viên gần đây</h3>
                <p className="text-xs text-[#8a8073]">Các lời giải mới nhất trên hệ thống</p>
              </div>
              <Link to="/instructor/submissions" className="text-xs text-[#193a2b] hover:text-[#2d5a3f] font-semibold flex items-center gap-1">
                Xem tất cả <ArrowRight size={13} />
              </Link>
            </div>

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
                        <span className="font-medium text-[#5c5446]">@{sub.username}</span> • {sub.language}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#8a8073] flex-shrink-0 pl-3">
                    <p className="font-mono">{sub.executionTime !== null && sub.executionTime !== undefined ? `${sub.executionTime}ms` : '—'}</p>
                    <p className="mt-0.5">{formatVNFull(sub.timestamp)}</p>
                  </div>
                </div>
              ))}

              {recentSubmissions.length === 0 && (
                <div className="py-6 text-center border border-dashed border-[#e5dac9] rounded-xl text-xs text-[#8a8073]">
                  Chưa có bài nộp nào từ sinh viên.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Top Rated Leaderboard */}
          <TopRatedLeaderboard maxItems={5} showTitle={true} />

          {/* Upcoming Deadlines */}
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e5dac9]">
              <div>
                <h3 className="text-sm font-bold font-serif text-[#191919]">Hạn chót bài tập</h3>
                <p className="text-[11px] text-[#8a8073]">Bài tập sinh viên cần hoàn thành</p>
              </div>
              <Link to="/instructor/classes" className="text-xs text-[#193a2b] font-semibold hover:underline">
                Chi tiết
              </Link>
            </div>

            <div className="space-y-2.5">
              {allHomeworks.filter((h) => h.status === 'active').slice(0, 4).map((hw) => (
                <div key={hw.id} className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e5dac9]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#191919] truncate">{hw.title}</p>
                      <p className="text-[11px] text-[#8a8073] mt-0.5">{hw.className}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex-shrink-0 flex items-center gap-1">
                      <Clock size={10} /> {hw.deadline}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#e5dac9]/60 flex items-center justify-between text-[11px] text-[#8a8073]">
                    <span>Tiến độ nộp</span>
                    <span className="font-semibold text-[#191919]">{hw.submittedStudents}/{hw.totalStudents} sinh viên</span>
                  </div>
                </div>
              ))}

              {allHomeworks.filter((h) => h.status === 'active').length === 0 && (
                <p className="text-xs text-[#8a8073] text-center py-4">Hiện không có bài tập nào đang mở.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Stats Breakdown */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#193a2b]" />
            <div>
              <h3 className="text-base font-bold font-serif text-[#191919]">Phân bố kết quả chấm bài</h3>
              <p className="text-xs text-[#8a8073]">Tỷ lệ các verdict trên toàn bộ các bài nộp</p>
            </div>
          </div>
          <span className="text-xs text-[#8a8073] font-semibold">
            Tổng {totalSubmissions} bài nộp
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(
            submissions.reduce((acc, s) => {
              acc[s.verdict] = (acc[s.verdict] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([verdict, count]) => {
            const vBarColors: Record<string, string> = {
              AC: 'bg-emerald-600',
              WA: 'bg-red-600',
              TLE: 'bg-amber-500',
              MLE: 'bg-amber-600',
              RTE: 'bg-orange-500',
              CE: 'bg-blue-500',
              PE: 'bg-pink-500',
              PENDING: 'bg-slate-500',
            };
            const vTextColors: Record<string, string> = {
              AC: 'text-emerald-700',
              WA: 'text-red-700',
              TLE: 'text-amber-700',
              MLE: 'text-amber-700',
              RTE: 'text-orange-700',
              CE: 'text-blue-700',
              PE: 'text-pink-700',
              PENDING: 'text-slate-700',
            };

            const percentage = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;

            return (
              <div key={verdict} className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e5dac9] text-center">
                <p className={`text-xl font-bold font-serif ${vTextColors[verdict] || 'text-[#191919]'}`}>
                  {count}
                </p>
                <p className="text-[11px] text-[#8a8073] mt-0.5 font-bold uppercase tracking-wider">
                  {verdict}
                </p>
                <div className="w-full bg-[#e5dac9]/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`${vBarColors[verdict] || 'bg-slate-400'} h-1.5 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#8a8073] mt-1 block">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
