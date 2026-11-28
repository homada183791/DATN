import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Users,
  BookOpen,
  Trophy,
  CheckCircle2,
  Clock,
  GraduationCap,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
import { useSubmissionsQuery } from '../../api/submissions';
import { useContestsQuery } from '../../api/contests';
import { formatVN, formatVNFull } from '../../utils/dateTime';
import UpcomingContestCountdown from '../../components/UpcomingContestCountdown';
import TopRatedLeaderboard from '../../components/TopRatedLeaderboard';
import { formatLanguageName } from '../../config/languages';

export default function InstructorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { myClasses } = useClass();
  const { allHomeworks } = useHomework();
  const { data: submissionData = [] } = useSubmissionsQuery();
  const { data: contests = [] } = useContestsQuery();

  const verdictFromStatus: Record<string, string> = {
    ACCEPTED: 'AC',
    WRONG_ANSWER: 'WA',
    TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE',
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
    AC: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
    WA: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    TLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    MLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    RTE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    CE: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
    PE: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    PENDING: 'text-(--ws-text) bg-(--ws-panel2) border-(--ws-border)',
  };

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* Welcome Banner */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">
            {t('instructorDashboard.welcome', { name: user?.fullName || user?.email })}
          </h2>
          <p className="text-(--ws-text) text-sm mt-1">
            {t('instructorDashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/instructor/classes"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold hover:bg-(--ws-accent-strong) transition-colors shadow-xs"
          >
            {t('instructorDashboard.manageClasses')}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Upcoming Contest Reminder with Live Countdown */}
      <UpcomingContestCountdown contests={contests} userRole="instructor" />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 shadow-xs hover:border-(--ws-accent)/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-(--ws-info-soft) rounded-lg flex items-center justify-center">
              <Users size={20} className="text-(--ws-info)" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-(--ws-muted) tabular-nums">
              {myClasses.length} {t('instructorDashboard.classesTitle')}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text)">{totalStudents}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.totalStudents')}</p>
        </div>

        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 shadow-xs hover:border-(--ws-accent)/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-(--ws-accent-soft) rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-(--ws-accent)" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-(--ws-muted) tabular-nums">
              {allHomeworks.length}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text)">{activeHomeworks}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.activeHomeworks')}</p>
        </div>

        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 shadow-xs hover:border-(--ws-accent)/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-(--ws-warn-soft) rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-(--ws-warn)" aria-hidden="true" />
            </div>
            {runningContests > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--ws-ok-soft) text-(--ws-ok) border border-(--ws-ok)/35">
                <span className="w-1.5 h-1.5 rounded-full bg-(--ws-ok) animate-pulse-dot" aria-hidden="true" /> Live
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text)">{runningContests}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.runningContests')}</p>
        </div>

        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 shadow-xs hover:border-(--ws-accent)/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-(--ws-ok-soft) rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-(--ws-ok)" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-(--ws-ok) bg-(--ws-ok-soft) px-2 py-0.5 rounded-md border border-(--ws-ok)/35 tabular-nums">
              {totalSubmissions} {t('instructorDashboard.submittedSuffix')}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text)">{acRate}%</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.acRate')}</p>
        </div>
      </div>

      {/* Main Grid: Left (Classes & Submissions) & Right (Top Rated & Deadlines) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Classes Overview */}
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-(--ws-text)">{t('instructorDashboard.classesTitle')}</h3>
                <p className="text-xs text-(--ws-muted)">{t('instructorDashboard.subtitle')}</p>
              </div>
              <Link to="/instructor/classes" className="text-xs text-(--ws-accent) hover:text-(--ws-accent) font-semibold flex items-center gap-1">
                {t('instructorDashboard.viewAll')} <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {myClasses.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/instructor/class/${cls.id}`}
                  className="block p-4 bg-(--ws-panel2) rounded-xl border border-(--ws-border) hover:border-(--ws-accent)/40 hover:bg-(--ws-hover)/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-(--ws-accent) text-(--ws-on-accent) rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                        <GraduationCap size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-(--ws-text) group-hover:text-(--ws-accent) transition-colors truncate">
                          {cls.name}
                        </p>
                        <p className="text-xs text-(--ws-muted) mt-0.5">
                          {cls.code}{cls.semester ? ` • ${cls.semester}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-(--ws-text) bg-(--ws-panel2) px-2 py-0.5 rounded-full border border-(--ws-border) shrink-0">
                      {cls.studentCount} {t('instructorDashboard.studentsAbbr')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-(--ws-muted) mt-3 pt-2.5 border-t border-(--ws-border)/60">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {cls.homeworkCount} {t('instructorDashboard.homeworkCount')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={12} /> {cls.contestCount} {t('instructorDashboard.contestCount')}
                    </span>
                  </div>
                </Link>
              ))}

              {myClasses.length === 0 && (
                <div className="sm:col-span-2 py-8 text-center border border-dashed border-(--ws-border) rounded-xl">
                  <p className="text-sm text-(--ws-muted)">{t('instructorDashboard.noClasses')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-(--ws-text)">{t('instructorDashboard.recentStudentSubmissions')}</h3>
                <p className="text-xs text-(--ws-muted)">{t('instructorDashboard.recentSubmissionsSubtitle')}</p>
              </div>
              <Link to="/instructor/submissions" className="text-xs text-(--ws-accent) hover:text-(--ws-accent) font-semibold flex items-center gap-1">
                {t('instructorDashboard.viewAll')} <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-2">
              {recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) hover:border-(--ws-accent)/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold font-mono border ${verdictColors[sub.verdict] || 'bg-(--ws-panel2) text-(--ws-text)'}`}>
                      {sub.verdict}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-(--ws-text) font-semibold truncate">{sub.problemTitle}</p>
                      <p className="text-xs text-(--ws-muted) mt-0.5">
                        <span className="font-medium text-(--ws-text)">@{sub.username}</span> • {formatLanguageName(sub.language)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-(--ws-muted) shrink-0 pl-3">
                    <p className="font-mono">{sub.executionTime !== null && sub.executionTime !== undefined ? `${sub.executionTime}ms` : '—'}</p>
                    <p className="mt-0.5">{formatVNFull(sub.timestamp)}</p>
                  </div>
                </div>
              ))}

              {recentSubmissions.length === 0 && (
                <div className="py-6 text-center border border-dashed border-(--ws-border) rounded-xl text-xs text-(--ws-muted)">
                  {t('instructorDashboard.noSubmissionsFromStudents')}
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
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-(--ws-border)">
              <div>
                <h3 className="text-sm font-bold font-serif text-(--ws-text)">{t('instructorDashboard.homeworkDeadlines')}</h3>
                <p className="text-[11px] text-(--ws-muted)">{t('instructorDashboard.homeworkDeadlinesSubtitle')}</p>
              </div>
              <Link to="/instructor/homework" className="text-xs text-(--ws-accent) font-semibold hover:underline">
                {t('instructorDashboard.details')}
              </Link>
            </div>

            <div className="space-y-2.5">
              {allHomeworks.filter((h) => h.status === 'active').slice(0, 4).map((hw) => (
                <div key={hw.id} className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border)">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-(--ws-text) truncate">{hw.title}</p>
                      <p className="text-[11px] text-(--ws-muted) mt-0.5">{hw.className}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-(--ws-warn) bg-(--ws-warn-soft) px-2 py-0.5 rounded-md border border-(--ws-warn)/35 shrink-0 flex items-center gap-1">
                      <Clock size={10} /> {formatVN(hw.deadline)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-(--ws-border)/60 flex items-center justify-between text-[11px] text-(--ws-muted)">
                    <span>{t('instructorDashboard.submissionProgress')}</span>
                    <span className="font-semibold text-(--ws-text)">{hw.submittedStudents}/{hw.totalStudents} {t('instructorDashboard.studentsSuffix')}</span>
                  </div>
                </div>
              ))}

              {allHomeworks.filter((h) => h.status === 'active').length === 0 && (
                <p className="text-xs text-(--ws-muted) text-center py-4">{t('instructorDashboard.noActiveHomework')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Stats Breakdown */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-(--ws-accent)" />
            <div>
              <h3 className="text-base font-bold font-serif text-(--ws-text)">{t('instructorDashboard.verdictDistribution')}</h3>
              <p className="text-xs text-(--ws-muted)">{t('instructorDashboard.verdictDistributionSubtitle')}</p>
            </div>
          </div>
          <span className="text-xs text-(--ws-muted) font-semibold">
            {t('instructorDashboard.totalSubmissionsLabel', { count: totalSubmissions })}
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
              AC: 'bg-(--ws-ok)',
              WA: 'bg-(--ws-danger)',
              TLE: 'bg-(--ws-warn)',
              MLE: 'bg-(--ws-warn)',
              RTE: 'bg-(--ws-warn)',
              CE: 'bg-(--ws-info)',
              PE: 'bg-(--ws-danger)',
              PENDING: 'bg-(--ws-faint)',
            };
            const vTextColors: Record<string, string> = {
              AC: 'text-(--ws-ok)',
              WA: 'text-(--ws-danger)',
              TLE: 'text-(--ws-warn)',
              MLE: 'text-(--ws-warn)',
              RTE: 'text-(--ws-warn)',
              CE: 'text-(--ws-info)',
              PE: 'text-(--ws-danger)',
              PENDING: 'text-(--ws-text)',
            };

            const percentage = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;

            return (
              <div key={verdict} className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center">
                <p className={`text-xl font-bold font-serif ${vTextColors[verdict] || 'text-(--ws-text)'}`}>
                  {count}
                </p>
                <p className="text-[11px] text-(--ws-muted) mt-0.5 font-bold uppercase tracking-wider">
                  {verdict}
                </p>
                <div className="w-full bg-(--ws-border)/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`${vBarColors[verdict] || 'bg-(--ws-faint)'} h-1.5 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-(--ws-muted) mt-1 block">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
