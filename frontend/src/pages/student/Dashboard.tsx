import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Trophy } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery, useLeaderboardQuery, type LeaderboardEntryDto } from '../../api/contests';
import { useSubmissionsQuery } from '../../api/submissions';
import { useHomeworksQuery } from '../../api/homeworks';
import { useAuth } from '../../context/AuthContext';
import { formatVN, formatVNFull } from '../../utils/dateTime';
import UpcomingContestCountdown from '../../components/UpcomingContestCountdown';
import TopRatedLeaderboard from '../../components/TopRatedLeaderboard';
import SubmissionDetailModal from '../../components/SubmissionDetailModal';
import { formatLanguageName } from '../../config/languages';

/** Nhãn kết quả chấm dùng token .verdict-* (khác nhau cả về độ sáng, không chỉ màu). */
const VERDICT_CLASS: Record<string, string> = {
  AC: 'verdict verdict-ac',
  WA: 'verdict verdict-wa',
  RTE: 'verdict verdict-wa',
  TLE: 'verdict verdict-tle',
  MLE: 'verdict verdict-tle',
  CE: 'verdict verdict-ce',
};

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

const card = 'bg-(--ws-panel) border border-(--ws-border) rounded-xl';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: contests, isLoading: contestsLoading, error: contestsError } = useContestsQuery();
  const { data: submissions, isLoading: submissionsLoading, error: submissionsError } = useSubmissionsQuery();
  const { data: homeworks } = useHomeworksQuery();
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  // Lấy mốc thời gian một lần khi mở trang, để phép tính "còn lại" ổn định giữa các lần render.
  const [now] = useState(() => Date.now());

  const activeContest = useMemo(
    () => contests?.find((contest) => contest.status === 'running') ?? contests?.[0],
    [contests],
  );
  const { data: leaderboard } = useLeaderboardQuery(activeContest?.id);
  const leaderboardRows: LeaderboardEntryDto[] = (leaderboard ?? []) as LeaderboardEntryDto[];

  const runningContests = (contests ?? []).filter((c) => c.status === 'running');
  const upcomingContests = (contests ?? []).filter((c) => c.status === 'upcoming');

  const solvedProblemIds = useMemo(
    () => new Set((submissions ?? []).filter((s) => s.status === 'ACCEPTED').map((s) => s.problem_id)),
    [submissions],
  );
  const submissionCount = submissions?.length ?? 0;
  const acceptedCount = (submissions ?? []).filter((s) => s.status === 'ACCEPTED').length;
  const successRate = submissionCount ? Math.round((acceptedCount / submissionCount) * 100) : 0;

  const recentSubmissions = (submissions ?? []).slice(0, 5).map((s) => ({
    id: s.id,
    problemTitle: s.problem_title,
    language: s.language,
    verdict: STATUS_MAP[s.status] ?? s.status,
    timestamp: s.created_at,
    executionTime: s.execution_time,
  }));

  /** "Việc cần làm tiếp": bài tập còn hạn gần nhất. */
  const nextHomework = useMemo(() => {
    const open = (homeworks ?? [])
      .filter((hw) => new Date(hw.deadline).getTime() > now)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    const hw = open[0];
    if (!hw) return null;
    const total = hw.tasks?.length ?? 0;
    const done = (hw.tasks ?? []).filter((task) => task.problem_id && solvedProblemIds.has(task.problem_id)).length;
    const nextTask = (hw.tasks ?? []).find((task) => !task.problem_id || !solvedProblemIds.has(task.problem_id));
    const msLeft = new Date(hw.deadline).getTime() - now;
    const hours = Math.floor(msLeft / 3_600_000);
    const timeLeft =
      hours >= 24
        ? t('studentDashboard.timeDaysHours', { d: Math.floor(hours / 24), h: hours % 24 })
        : t('studentDashboard.timeHoursMinutes', { h: hours, m: Math.floor((msLeft % 3_600_000) / 60_000) });
    const link =
      nextTask?.problem_id
        ? `/student/class/${hw.class_id}/homework/${hw.id}/problem/${nextTask.problem_id}`
        : `/student/class/${hw.class_id}/homework/${hw.id}`;
    return { hw, total, done, timeLeft, link, className: hw.class?.name };
  }, [homeworks, solvedProblemIds, now, t]);

  if (contestsError instanceof ApiError) {
    return (
      <div className={`${card} p-10 text-center`}>
        <Trophy size={40} className="text-(--ws-faint) mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-xl font-bold text-(--ws-text)">Không thể tải trang tổng quan</h2>
        <p className="mt-2 text-sm text-(--ws-muted)">{contestsError.message}</p>
      </div>
    );
  }

  const stats = [
    { label: t('studentDashboard.solvedCount'), value: solvedProblemIds.size, note: null },
    { label: t('studentDashboard.totalSubmissions'), value: submissionCount, note: null },
    {
      label: t('studentDashboard.accuracyRate'),
      value: `${successRate}%`,
      note: t('studentDashboard.acOfTotal', { ac: acceptedCount, total: submissionCount }),
    },
    {
      label: t('studentDashboard.runningContestCount'),
      value: runningContests.length,
      note: runningContests.length > 0 ? t('studentDashboard.live') : null,
    },
  ];

  return (
    <div className="max-w-[1120px] mx-auto space-y-7 text-(--ws-text)">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-(--ws-muted) mb-1.5">{formatVN(new Date(now), { time: false })}</p>
          <h1 className="text-[28px] font-bold tracking-tight">
            {t('studentDashboard.welcome', { name: user?.fullName || user?.email })}
          </h1>
        </div>
        <Link
          to="/student/problems"
          className="inline-flex items-center gap-2 min-h-11 px-[18px] rounded-[10px] bg-(--ws-accent) text-(--ws-panel) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t('studentDashboard.practiceBtn')}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {/* Một khối dẫn dắt: việc cần làm tiếp */}
      <section
        aria-labelledby="next-up"
        className="rounded-2xl bg-(--ws-accent) text-(--ws-panel) px-8 py-7 flex flex-wrap items-center justify-between gap-6"
      >
        {nextHomework ? (
          <>
            <div className="flex-1 min-w-[260px]">
              <p id="next-up" className="text-xs font-semibold uppercase tracking-[0.08em] opacity-80 mb-2">
                {t('studentDashboard.nextUpTitle')}
              </p>
              <h2 className="text-[22px] font-bold mb-1.5">{nextHomework.hw.title}</h2>
              <p className="text-sm opacity-80 mb-4">
                {nextHomework.className ? `${nextHomework.className} · ` : ''}
                {t('studentDashboard.dueAt', { date: formatVNFull(nextHomework.hw.deadline) })}
              </p>
              <div className="flex items-center gap-3 max-w-[420px]">
                <div
                  className="flex-1 h-2 rounded bg-(--ws-panel)/25"
                  role="progressbar"
                  aria-valuenow={nextHomework.done}
                  aria-valuemin={0}
                  aria-valuemax={nextHomework.total}
                  aria-label={t('studentDashboard.nextUpTitle')}
                >
                  <div
                    className="h-full rounded bg-(--ws-panel)"
                    style={{ width: `${nextHomework.total ? (nextHomework.done / nextHomework.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-mono text-[13px] font-semibold">
                  {t('studentDashboard.nextUpProgress', { done: nextHomework.done, total: nextHomework.total })}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <div className="text-[26px] font-bold tabular-nums">{nextHomework.timeLeft}</div>
                <div className="text-xs opacity-80">{t('studentDashboard.nextUpTimeLeft')}</div>
              </div>
              <Link
                to={nextHomework.link}
                className="inline-flex items-center min-h-11 px-5 rounded-[10px] bg-(--ws-panel) text-(--ws-accent) text-sm font-bold hover:opacity-90"
              >
                {t('studentDashboard.nextUpContinue')}
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-[260px]">
              <p id="next-up" className="text-xs font-semibold uppercase tracking-[0.08em] opacity-80 mb-2">
                {t('studentDashboard.nextUpTitle')}
              </p>
              <h2 className="text-[22px] font-bold mb-1.5">{t('studentDashboard.nextUpNone')}</h2>
              <p className="text-sm opacity-80">{t('studentDashboard.nextUpNoneDesc')}</p>
            </div>
            <Link
              to="/student/problems"
              className="inline-flex items-center min-h-11 px-5 rounded-[10px] bg-(--ws-panel) text-(--ws-accent) text-sm font-bold hover:opacity-90"
            >
              {t('studentDashboard.practiceBtn')}
            </Link>
          </>
        )}
      </section>

      {/* Chỉ hiện đếm ngược khi thật sự có kỳ thi sắp tới; nếu không thẻ này nói "chưa có kỳ thi" dù đang có kỳ thi chạy */}
      {upcomingContests.length > 0 && <UpcomingContestCountdown contests={contests ?? []} userRole="student" />}

      <section aria-label="Thống kê" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${card} px-5 py-[18px]`}>
            <div className="text-[13px] font-medium text-(--ws-muted)">{s.label}</div>
            <div className="font-mono text-[28px] font-bold mt-1.5">{s.value}</div>
            {s.note && <div className="text-xs text-(--ws-muted) mt-1">{s.note}</div>}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-5 items-start">
        <section aria-labelledby="dash-contests" className={`${card} flex-[1_1_300px] min-w-0`}>
          <div className="flex items-center justify-between px-5 py-[18px] border-b border-(--ws-border-soft)">
            <h2 id="dash-contests" className="text-base font-bold">{t('studentDashboard.contests')}</h2>
            <Link to="/student/contest" className="text-[13px] font-semibold text-(--ws-accent) hover:underline">
              {t('instructorDashboard.viewAll')}
            </Link>
          </div>
          {contestsLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-(--ws-muted)">
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> {t('studentDashboard.loadingContests')}
            </div>
          ) : runningContests.length + upcomingContests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-(--ws-muted)">{t('studentDashboard.noContestsAvailable')}</p>
          ) : (
            <ul>
              {[...runningContests, ...upcomingContests].slice(0, 4).map((contest) => (
                <li key={contest.id} className="border-b border-(--ws-border-soft) last:border-b-0">
                  <Link
                    to={`/student/contest?open=${contest.id}`}
                    className="block px-5 py-4 hover:bg-(--ws-hover) transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{contest.title}</span>
                      <span
                        className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          contest.status === 'running'
                            ? 'bg-(--ws-verdict-ac-bg) text-(--ws-verdict-ac-fg)'
                            : 'bg-(--ws-verdict-tle-bg) text-(--ws-verdict-tle-fg)'
                        }`}
                      >
                        {contest.status === 'running' ? t('studentDashboard.statusRunning') : t('studentDashboard.statusUpcoming')}
                      </span>
                    </div>
                    <div className="text-[13px] text-(--ws-muted) mt-1">
                      {contest.startTime ? formatVN(contest.startTime) : '-'}
                      {contest.endTime && ` · ${t('studentDashboard.deadlinePrefix')}: ${formatVN(contest.endTime)}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="dash-subs" className={`${card} flex-[2_1_520px] min-w-0`}>
          <div className="flex items-center justify-between px-5 py-[18px] border-b border-(--ws-border-soft)">
            <h2 id="dash-subs" className="text-base font-bold">{t('studentDashboard.recentSubmissions')}</h2>
            <Link to="/student/submissions" className="text-[13px] font-semibold text-(--ws-accent) hover:underline">
              {t('studentDashboard.submissionHistory')}
            </Link>
          </div>
          {submissionsLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-(--ws-muted)">
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> {t('studentDashboard.loadingSubmissions')}
            </div>
          ) : submissionsError ? (
            <p className="px-5 py-8 text-center text-sm text-(--ws-muted)">{t('studentDashboard.submissionsError')}</p>
          ) : recentSubmissions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-(--ws-muted)">{t('studentDashboard.noSubmissions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-(--ws-muted) whitespace-nowrap">
                    <th scope="col" className="px-5 py-2.5">{t('studentDashboard.thProblem')}</th>
                    <th scope="col" className="px-2 py-2.5">{t('studentDashboard.thVerdict')}</th>
                    <th scope="col" className="px-2 py-2.5">{t('studentDashboard.thLanguage')}</th>
                    <th scope="col" className="px-2 py-2.5 text-right">{t('studentDashboard.thTime')}</th>
                    <th scope="col" className="px-5 py-2.5 text-right">{t('studentDashboard.thSubmittedAt')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[13px]">
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-t border-(--ws-border-soft) hover:bg-(--ws-hover)">
                      <td className="px-5 py-3 font-sans font-medium">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub.id)}
                          className="text-left hover:text-(--ws-accent) hover:underline"
                        >
                          {sub.problemTitle}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <span className={VERDICT_CLASS[sub.verdict] ?? 'verdict bg-(--ws-panel2) text-(--ws-muted)'}>{sub.verdict}</span>
                      </td>
                      <td className="px-2 py-3 font-sans">{formatLanguageName(sub.language)}</td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">{sub.executionTime != null ? `${sub.executionTime} ms` : '—'}</td>
                      <td className="px-5 py-3 text-right text-(--ws-muted) whitespace-nowrap">{formatVN(sub.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <TopRatedLeaderboard maxItems={5} showTitle={true} />
        {activeContest && leaderboardRows.length > 0 && (
          <section aria-labelledby="dash-lb" className={`${card} p-5`}>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-(--ws-border-soft)">
              <div className="min-w-0">
                <h2 id="dash-lb" className="text-sm font-bold">BXH kỳ thi hiện tại</h2>
                <p className="text-xs text-(--ws-muted) truncate">{activeContest.title}</p>
              </div>
              <Link to={`/student/contest?open=${activeContest.id}`} className="text-[13px] font-semibold text-(--ws-accent) hover:underline">
                {t('instructorDashboard.viewAll')}
              </Link>
            </div>
            <ol className="space-y-1">
              {leaderboardRows.slice(0, 5).map((entry) => (
                <li key={`${entry.rank}-${entry.username}`} className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-(--ws-hover)">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[13px] w-6 text-(--ws-muted)">{entry.rank}</span>
                    <span className="text-sm font-semibold truncate">{entry.fullName}</span>
                  </div>
                  <span className="font-mono text-[13px]">{entry.solvedCount} AC</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal submissionId={selectedSubmission} onClose={() => setSelectedSubmission(null)} />
      )}
    </div>
  );
}
