import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/http';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import {
  MapPin,
  Calendar,
  BarChart3,
  GraduationCap,
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
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [heatmap, setHeatmap] = useState<Array<{ date: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    refreshProfile?.();

    Promise.all([
      apiFetch<UserStatsData>('/api/v1/users/me/stats'),
      apiFetch<{ activity_logs: Array<{ activity_date: string; submission_count: number }> }>(
        '/api/v1/users/me/heatmap',
      ).catch(() => ({ activity_logs: [] })),
    ])
      .then(([statsData, heatmapResp]) => {
        if (isMounted) {
          setStats(statsData);
          setHeatmap(
            (heatmapResp.activity_logs ?? []).map((l) => ({
              date: l.activity_date.slice(0, 10),
              count: l.submission_count,
            })),
          );
        }
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
    <div className="space-y-5 text-(--ws-text)">
      {/* Profile Header */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 bg-(--ws-accent) rounded-lg flex items-center justify-center text-(--ws-on-accent) text-2xl font-bold font-serif border border-(--ws-border) overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-(--ws-text) font-serif">
                  {user?.fullName || user?.username}
                </h2>
                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${
                  isInstructor ? 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/30' : 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/30'
                }`}>
                  {isInstructor ? t('personal.roleInstructor') : t('personal.roleStudent')}
                </span>
              </div>

              <p className="text-(--ws-muted) font-mono text-xs mt-0.5">@{user?.username}</p>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-(--ws-muted)">
                {user?.institution && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} aria-hidden="true" /> {user.institution}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} aria-hidden="true" /> {t('personal.joined', { date: user?.joinDate })}
                </span>
              </div>
            </div>
          </div>

          {user?.bio && (
            <p className="mt-4 text-(--ws-text) text-sm leading-relaxed px-3 py-2.5 bg-(--ws-panel2)/60 rounded border border-(--ws-border)">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-md border border-(--ws-border) bg-(--ws-panel) p-4 space-y-2">
                <div className="h-3 w-20 rounded ws-skeleton" />
                <div className="h-7 w-16 rounded ws-skeleton" />
              </div>
            ))}
          </div>
          <div className="h-44 rounded-md border border-(--ws-border) bg-(--ws-panel) ws-skeleton" />
        </div>
      ) : (
        <>
          {/* Nếu là Giảng viên: Hiển thị Khối quản lý giảng dạy */}
          {isInstructor && stats?.instructor_stats && (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-(--ws-muted) mb-3 flex items-center gap-2">
                <GraduationCap size={16} className="text-(--ws-accent)" aria-hidden="true" /> {t('personal.teachingActivity')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-(--ws-panel2)/60 rounded border border-(--ws-border)">
                  <p className="text-xs text-(--ws-muted)">{t('personal.classesManaged')}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text) mt-1">{stats.instructor_stats.classes_count}</p>
                </div>
                <div className="p-3.5 bg-(--ws-panel2)/60 rounded border border-(--ws-border)">
                  <p className="text-xs text-(--ws-muted)">{t('personal.studentsEnrolled')}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text) mt-1">{stats.instructor_stats.total_students_count}</p>
                </div>
                <div className="p-3.5 bg-(--ws-panel2)/60 rounded border border-(--ws-border)">
                  <p className="text-xs text-(--ws-muted)">{t('personal.contestsHosted')}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text) mt-1">{stats.instructor_stats.contests_count}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid (ẩn với giảng viên) */}
          {!isInstructor && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md px-4 py-3.5">
                <p className="text-xs font-medium text-(--ws-muted)">{t('personal.solvedCount')}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-ok) mt-1">{stats?.solved_count || 0}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md px-4 py-3.5">
                <p className="text-xs font-medium text-(--ws-muted)">{t('personal.totalSubmissions')}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text) mt-1">{stats?.total_submissions || 0}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md px-4 py-3.5">
                <p className="text-xs font-medium text-(--ws-muted)">{t('personal.ratingElo')}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-accent) mt-1">{user?.rating ?? 1200}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md px-4 py-3.5">
                <p className="text-xs font-medium text-(--ws-muted)">{t('personal.acceptanceRate')}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-(--ws-text) mt-1">{stats?.ac_rate || 0}%</p>
              </div>
            </div>
          )}

          {/* Activity Heatmap */}
          <ActivityHeatmap data={heatmap} />

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Verdict Distribution (Thực tế) */}
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md p-5">
              <h3 className="text-base font-bold text-(--ws-text) font-serif mb-4 flex items-center gap-2">
                <BarChart3 size={17} className="text-(--ws-info)" aria-hidden="true" /> {t('personal.verdictDistributionTitle')}
              </h3>

              {totalSubs === 0 ? (
                <div className="text-center py-8 text-(--ws-muted) text-sm">
                  <HelpCircle size={26} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  {t('personal.noSubmissionsRecorded')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { verdict: 'AC', label: 'Accepted', color: 'bg-(--ws-ok)', text: 'text-(--ws-ok)' },
                    { verdict: 'WA', label: 'Wrong Answer', color: 'bg-(--ws-danger)', text: 'text-(--ws-danger)' },
                    { verdict: 'TLE', label: 'Time Limit Exceeded', color: 'bg-(--ws-warn)', text: 'text-(--ws-warn)' },
                    { verdict: 'RTE', label: 'Runtime Error', color: 'bg-(--ws-warn)', text: 'text-(--ws-warn)' },
                    { verdict: 'CE', label: 'Compile Error', color: 'bg-(--ws-info)', text: 'text-(--ws-info)' },
                  ].map((item) => {
                    const count = verdictStats[item.verdict] || 0;
                    const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                    return (
                      <div key={item.verdict} className="flex items-center gap-3">
                        <span className={`text-xs font-bold font-mono w-9 ${item.text}`}>{item.verdict}</span>
                        <div className="flex-1 bg-(--ws-panel2) rounded-sm h-2.5 overflow-hidden">
                          <div
                            className={`${item.color} h-2.5 rounded-sm transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-(--ws-text) w-20 text-right">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Solved Problems List (Thực tế) */}
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md p-5">
              <h3 className="text-base font-bold text-(--ws-text) font-serif mb-4 flex items-center justify-between">
                <span>{t('personal.solvedProblems')}</span>
                <span className="text-xs font-mono tabular-nums px-2 py-0.5 bg-(--ws-accent-soft) text-(--ws-accent) font-semibold rounded">
                  {t('personal.solvedCountLabel', { count: stats?.solved_problems?.length ?? 0 })}
                </span>
              </h3>

              {!stats?.solved_problems || stats.solved_problems.length === 0 ? (
                <div className="text-center py-8 text-(--ws-muted) text-sm">
                  <HelpCircle size={26} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  {t('personal.noSolvedYet')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {stats.solved_problems.map((p) => {
                    const diffColors: Record<string, string> = {
                      EASY: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/30',
                      MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/30',
                      HARD: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/30',
                    };
                    return (
                      <span
                        key={p.id}
                        className={`px-2.5 py-1 rounded text-xs font-medium border ${diffColors[p.difficulty] || 'bg-(--ws-panel2) text-(--ws-text) border-(--ws-border)'}`}
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
