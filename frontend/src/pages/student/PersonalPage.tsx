import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/http';
import ActivityHeatmap from '../../components/ActivityHeatmap';
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
    <div className="space-y-6 text-(--ws-text)">
      {/* Profile Header */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-24 h-24 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-2xl flex items-center justify-center text-(--ws-on-accent) text-3xl font-bold font-serif border-4 border-(--ws-panel) shadow-lg overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-(--ws-text) font-serif">
                  {user?.fullName || user?.username}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isInstructor ? 'bg-(--ws-warn-soft) text-(--ws-warn)' : 'bg-(--ws-ok-soft) text-(--ws-ok)'
                }`}>
                  {isInstructor ? t('personal.roleInstructor') : t('personal.roleStudent')}
                </span>
              </div>

              <p className="text-(--ws-muted) text-sm mt-0.5">@{user?.username}</p>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-(--ws-text)">
                {user?.institution && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-(--ws-muted)" /> {user.institution}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-(--ws-muted)" /> {t('personal.joined', { date: user?.joinDate })}
                </span>
              </div>
            </div>
          </div>

          {user?.bio && (
            <p className="mt-4 text-(--ws-text) text-sm leading-relaxed p-3 bg-(--ws-panel2)/60 rounded-xl border border-(--ws-border)/60">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-(--ws-panel) border border-(--ws-border) rounded-xl shadow-sm">
          <Loader2 className="animate-spin text-(--ws-accent)" size={28} />
          <span className="ml-3 text-sm text-(--ws-text)">{t('personal.loading')}</span>
        </div>
      ) : (
        <>
          {/* Nếu là Giảng viên: Hiển thị Khối quản lý giảng dạy */}
          {isInstructor && stats?.instructor_stats && (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-(--ws-text) font-serif mb-4 flex items-center gap-2">
                <GraduationCap size={20} className="text-(--ws-accent)" /> {t('personal.teachingActivity')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-(--ws-panel2)/60 rounded-xl border border-(--ws-border) text-center">
                  <BookOpen size={22} className="text-(--ws-accent) mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats.instructor_stats.classes_count}</p>
                  <p className="text-xs text-(--ws-muted)">{t('personal.classesManaged')}</p>
                </div>
                <div className="p-4 bg-(--ws-panel2)/60 rounded-xl border border-(--ws-border) text-center">
                  <Users size={22} className="text-(--ws-info) mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats.instructor_stats.total_students_count}</p>
                  <p className="text-xs text-(--ws-muted)">{t('personal.studentsEnrolled')}</p>
                </div>
                <div className="p-4 bg-(--ws-panel2)/60 rounded-xl border border-(--ws-border) text-center">
                  <Trophy size={22} className="text-(--ws-warn) mx-auto mb-1.5" />
                  <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats.instructor_stats.contests_count}</p>
                  <p className="text-xs text-(--ws-muted)">{t('personal.contestsHosted')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid (ẩn với giảng viên) */}
          {!isInstructor && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 text-center shadow-sm">
                <CheckCircle2 size={24} className="text-(--ws-accent) mx-auto mb-2" />
                <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats?.solved_count || 0}</p>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('personal.solvedCount')}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 text-center shadow-sm">
                <Send size={24} className="text-(--ws-info) mx-auto mb-2" />
                <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats?.total_submissions || 0}</p>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('personal.totalSubmissions')}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 text-center shadow-sm">
                <Award size={24} className="text-(--ws-warn) mx-auto mb-2" />
                <p className="text-2xl font-bold font-serif text-(--ws-text)">{user?.rating ?? 1200}</p>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('personal.ratingElo')}</p>
              </div>
              <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-5 text-center shadow-sm">
                <TrendingUp size={24} className="text-(--ws-info) mx-auto mb-2" />
                <p className="text-2xl font-bold font-serif text-(--ws-text)">{stats?.ac_rate || 0}%</p>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('personal.acceptanceRate')}</p>
              </div>
            </div>
          )}

          {/* Activity Heatmap */}
          <ActivityHeatmap data={heatmap} />

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Verdict Distribution (Thực tế) */}
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-(--ws-text) font-serif mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-(--ws-info)" /> {t('personal.verdictDistributionTitle')}
              </h3>

              {totalSubs === 0 ? (
                <div className="text-center py-8 text-(--ws-muted) text-sm">
                  <HelpCircle size={28} className="mx-auto mb-2 opacity-50" />
                  {t('personal.noSubmissionsRecorded')}
                </div>
              ) : (
                <div className="space-y-3">
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
                        <div className="flex-1 bg-(--ws-panel2) rounded-full h-3 overflow-hidden">
                          <div
                            className={`${item.color} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-(--ws-text) w-12 text-right">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Solved Problems List (Thực tế) */}
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-(--ws-text) font-serif mb-4 flex items-center justify-between">
                <span>{t('personal.solvedProblems')}</span>
                <span className="text-xs px-2 py-0.5 bg-(--ws-accent)/10 text-(--ws-accent) font-semibold rounded-full">
                  {t('personal.solvedCountLabel', { count: stats?.solved_problems?.length ?? 0 })}
                </span>
              </h3>

              {!stats?.solved_problems || stats.solved_problems.length === 0 ? (
                <div className="text-center py-8 text-(--ws-muted) text-sm">
                  <HelpCircle size={28} className="mx-auto mb-2 opacity-50" />
                  {t('personal.noSolvedYet')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                  {stats.solved_problems.map((p) => {
                    const diffColors: Record<string, string> = {
                      EASY: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
                      MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
                      HARD: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35',
                    };
                    return (
                      <span
                        key={p.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${diffColors[p.difficulty] || 'bg-(--ws-panel2) text-(--ws-text) border-(--ws-border)'}`}
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
