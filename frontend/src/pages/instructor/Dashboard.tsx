import { useAuth } from '../../context/AuthContext';
import {
  Users,
  BookOpen,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
import { useSubmissionsQuery } from '../../api/submissions';
import { useContestsQuery } from '../../api/contests';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { myClasses } = useClass();
  const { allHomeworks } = useHomework();
  const { data: submissionData = [] } = useSubmissionsQuery();
  const { data: contests = [] } = useContestsQuery();
  const submissions = submissionData.map((submission) => ({
    ...submission,
    verdict: submission.status === 'ACCEPTED' ? 'AC' : submission.status,
    executionTime: submission.execution_time ?? 0,
    timestamp: submission.created_at,
    problemTitle: submission.problem_title,
  }));

  const totalStudents = myClasses.reduce((sum, c) => sum + c.studentCount, 0);
  const activeHomeworks = allHomeworks.filter((h) => h.status === 'active').length;
  const runningContests = contests.filter((contest) => contest.status === 'running').length;
  const totalSubmissions = submissions.length;
  const acRate = Math.round((submissions.filter((s) => s.verdict === 'AC').length / totalSubmissions) * 100);

  const recentSubmissions = submissions.slice(0, 6);

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    WA: 'text-red-800 bg-red-100 border-red-300',
    TLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    MLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    RTE: 'text-orange-800 bg-orange-100 border-orange-300',
    CE: 'text-blue-800 bg-blue-100 border-blue-300',
    PE: 'text-pink-800 bg-pink-100 border-pink-300',
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#cc5a37]/10 via-[#e5dac9]/20 to-[#193a2b]/10 border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold font-serif text-[#191919] mb-1">
          Xin chào, {user?.fullName}! 👋
        </h2>
        <p className="text-[#5c5446] text-sm">
          Quản lý học thuật, theo dõi tiến độ nộp bài và giám sát kỳ thi trực tuyến của sinh viên.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-purple-700" />
            </div>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{totalStudents}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tổng sinh viên</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#193a2b]/10 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-[#193a2b]" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{activeHomeworks}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài tập đang mở</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-yellow-700" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{runningContests}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Kỳ thi đang chạy</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-5 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-700" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#191919]">{acRate}%</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tỷ lệ AC</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Classes Overview */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-serif text-[#191919]">Lớp học</h3>
            <Link to="/instructor/students" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {myClasses.map((cls) => (
              <div key={cls.id} className="p-4 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]/50 hover:border-[#193a2b]/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-lg flex items-center justify-center shadow-sm">
                      <GraduationCap size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#191919]">{cls.name}</p>
                      <p className="text-xs text-[#8a8073] mt-0.5">{cls.code} • {cls.semester}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#e5dac9]">{cls.studentCount} SV</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#8a8073] mt-3">
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {cls.homeworkCount} bài tập</span>
                  <span className="flex items-center gap-1"><Trophy size={12} /> {cls.contestCount} kỳ thi</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-serif text-[#191919]">Bài nộp gần đây</h3>
            <Link to="/student/submission" className="text-sm text-[#193a2b] hover:text-[#2d5a3f] font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-[#f7f4eb]/50 rounded-lg border border-[#e5dac9]/50">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-md font-bold border ${verdictColors[sub.verdict]}`}>
                    {sub.verdict}
                  </span>
                  <div>
                    <p className="text-sm text-[#191919] font-semibold">{sub.problemTitle}</p>
                    <p className="text-xs text-[#8a8073] mt-0.5">@{sub.username} • {sub.language}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-[#8a8073]">
                  <p>{sub.executionTime}ms</p>
                  <p className="mt-0.5">{sub.timestamp.slice(5, 16)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Stats */}
      <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-serif text-[#191919] mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#193a2b]" /> Thống kê nộp bài
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(
            submissions.reduce((acc, s) => {
              acc[s.verdict] = (acc[s.verdict] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([verdict, count]) => {
            const vColors: Record<string, string> = {
              AC: 'from-emerald-600 to-emerald-400',
              WA: 'from-red-600 to-red-400',
              TLE: 'from-yellow-500 to-yellow-400',
              MLE: 'from-yellow-500 to-yellow-400',
              RTE: 'from-orange-500 to-orange-400',
              CE: 'from-blue-500 to-blue-400',
              PE: 'from-pink-500 to-pink-400',
            };
            const tColors: Record<string, string> = {
              AC: 'text-emerald-700 font-bold',
              WA: 'text-red-700 font-bold',
              TLE: 'text-yellow-700 font-bold',
              MLE: 'text-yellow-700 font-bold',
              RTE: 'text-orange-700 font-bold',
              CE: 'text-blue-700 font-bold',
              PE: 'text-pink-700 font-bold',
            };
            return (
              <div key={verdict} className="p-4 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9] text-center shadow-xs">
                <p className={`text-lg font-serif ${tColors[verdict]}`}>{count}</p>
                <p className="text-xs text-[#8a8073] mt-1 font-semibold uppercase tracking-wider">{verdict}</p>
                <div className="w-full bg-[#f0ebd9] rounded-full h-1.5 mt-2">
                  <div
                    className={`bg-gradient-to-r ${vColors[verdict]} h-1.5 rounded-full`}
                    style={{ width: `${(count / totalSubmissions) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white border border-[#e5dac9] rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-serif text-[#191919] mb-4">Hạn chót sắp tới</h3>
        <div className="space-y-3">
          {allHomeworks.filter((h) => h.status === 'active').map((hw) => (
            <div key={hw.id} className="flex items-center justify-between p-3 bg-[#f7f4eb]/50 rounded-xl border border-[#e5dac9]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={20} className="text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-[#191919] font-semibold">{hw.title}</p>
                  <p className="text-xs text-[#8a8073] mt-0.5">{hw.className}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-yellow-700 font-semibold flex items-center gap-1 justify-end">
                  <Clock size={14} /> {hw.deadline}
                </p>
                <p className="text-xs text-[#8a8073] mt-0.5">{hw.submittedStudents}/{hw.totalStudents} đã nộp</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
