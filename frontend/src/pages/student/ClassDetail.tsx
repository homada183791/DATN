import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworksQuery } from '../../api/homeworks';
import { useClassesQuery } from '../../api/classes';
import { useSubmissionsQuery } from '../../api/submissions';
import { useMemo } from 'react';
import { formatVNFull } from '../../utils/dateTime';
import { useTranslation } from 'react-i18next';

function deadlineInfo(deadline: string, t: (key: string, options?: Record<string, number>) => string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: t('deadline.closed'), color: 'text-[#8a8073]', chipClass: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]', closed: true };
  if (days <= 1) return { label: t('deadline.lessThanDay'), color: 'text-red-600', chipClass: 'bg-red-50 text-red-700 border-red-200', closed: false };
  if (days <= 3) return { label: t('deadline.days', { count: days }), color: 'text-yellow-700', chipClass: 'bg-yellow-50 text-yellow-800 border-yellow-200', closed: false };
  return { label: t('deadline.days', { count: days }), color: 'text-emerald-700', chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', closed: false };
}

import {
  GraduationCap,
  Clock,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Trophy,
} from 'lucide-react';

export default function StudentClassDetail() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: apiClasses = [], isLoading: classLoading } = useClassesQuery();
  const { data: homeworks = [], isLoading: hwLoading } = useClassHomeworksQuery(classId);
  const { data: submissions = [] } = useSubmissionsQuery();

  const classInfo = useMemo(
    () => apiClasses.find((c) => c.id === classId),
    [apiClasses, classId]
  );

  const solvedProblemIds = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      const status = s.status?.toUpperCase();
      if (status === 'ACCEPTED' || status === 'AC') {
        set.add(s.problem_id);
      }
    });
    return set;
  }, [submissions]);

  const { totalClassTasks, solvedClassTasks, overallProgressPct } = useMemo(() => {
    let total = 0;
    let solved = 0;
    homeworks.forEach((hw) => {
      if (Array.isArray(hw.tasks)) {
        hw.tasks.forEach((t: any) => {
          total += 1;
          if (t.problem_id && solvedProblemIds.has(t.problem_id)) {
            solved += 1;
          }
        });
      }
    });
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    return { totalClassTasks: total, solvedClassTasks: solved, overallProgressPct: pct };
  }, [homeworks, solvedProblemIds]);

  const activeCount = homeworks.filter((hw) => {
    const d = deadlineInfo(hw.deadline, t);
    return !d.closed;
  }).length;

  const isLoading = classLoading || hwLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
        <p className="font-semibold text-[#191919]">{t('studentContest.notFoundClass')}</p>
        <button onClick={() => navigate('/student/class')} className="mt-4 text-sm text-[#193a2b] hover:underline">
          {t('studentContest.backToClasses')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8a8073]">
        <button onClick={() => navigate('/student/class')} className="hover:text-[#193a2b] transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> {t('studentContest.classLabel')}
        </button>
        <ChevronRight size={14} />
        <span className="text-[#191919] font-medium truncate">{classInfo.name}</span>
      </div>

      {/* Class header */}
      <div className="bg-gradient-to-br from-[#193a2b] to-[#2a5540] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={20} className="flex-shrink-0 opacity-80" />
              <span className="text-sm opacity-75">{classInfo.semester}</span>
            </div>
            <h1 className="text-2xl font-bold font-serif mb-1">{classInfo.name}</h1>
            {classInfo.description && (
              <p className="text-sm opacity-80 line-clamp-2 mt-1">{classInfo.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs opacity-60 mb-1">{t('studentClass.classCode')}</p>
            <p className="text-lg font-mono font-bold tracking-widest">{classInfo.invite_code}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/20 text-sm">
          <span className="flex items-center gap-1.5 opacity-80">
            <Users size={14} /> {t('studentClass.studentCount', { count: classInfo.students?.length ?? 0 })}
          </span>
          <span className="flex items-center gap-1.5 opacity-80">
            <BookOpen size={14} /> {t('studentClass.homeworkCount', { count: homeworks.length })}
          </span>
          <span className="flex items-center gap-1.5 opacity-80">
            <CheckCircle2 size={14} /> {t('studentClass.activeCount', { count: activeCount })}
          </span>
        </div>
      </div>

      {/* Overall Class Progress Banner */}
      {totalClassTasks > 0 && (
        <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[#193a2b]" />
              <span className="font-bold text-sm text-[#191919]">Tiến độ bài tập trong lớp</span>
            </div>
            <span
              className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                overallProgressPct === 100
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : overallProgressPct > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]'
              }`}
            >
              {solvedClassTasks}/{totalClassTasks} bài ({overallProgressPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#f0ebd9] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                overallProgressPct === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-[#193a2b]'
              }`}
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
          <p className="text-xs text-[#8a8073] mt-2">
            {overallProgressPct === 100
              ? '🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập được giao trong lớp học này!'
              : `Bạn đã giải quyết được ${solvedClassTasks} trên tổng số ${totalClassTasks} bài toán được giao.`}
          </p>
        </div>
      )}

      {/* Homework list */}
      <div>
        <h2 className="text-lg font-bold font-serif text-[#191919] mb-4">{t('studentClass.homeworkList')}</h2>

        {homeworks.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">{t('studentClass.emptyHomework')}</p>
            <p className="text-sm text-[#8a8073] mt-1">{t('studentClass.teacherNoHomework')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {homeworks.map((hw) => {
              const dl = deadlineInfo(hw.deadline, t);
              const hwTasks = Array.isArray(hw.tasks) ? hw.tasks : [];
              const taskCount = hwTasks.length;
              const solvable = (hwTasks as Array<{ problem_id?: string }>).filter((t) => !!t.problem_id).length;
              const hwSolved = (hwTasks as Array<{ problem_id?: string }>).filter((t) => t.problem_id && solvedProblemIds.has(t.problem_id)).length;
              const hwPct = taskCount > 0 ? Math.round((hwSolved / taskCount) * 100) : 0;

              return (
                <Link
                  key={hw.id}
                  to={`/student/class/${classId}/homework/${hw.id}`}
                  className="block bg-white border border-[#e5dac9] rounded-2xl p-5 hover:shadow-md hover:border-[#193a2b]/30 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[#191919] group-hover:text-[#193a2b] transition-colors">
                          {hw.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${dl.chipClass}`}>
                          {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}
                          {dl.label}
                        </span>
                        {taskCount > 0 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                              hwPct === 100
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : hwPct > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]'
                            }`}
                          >
                            Hoàn thành {hwSolved}/{taskCount} ({hwPct}%)
                          </span>
                        )}
                      </div>
                      {hw.description && (
                        <p className="text-sm text-[#5c5446] line-clamp-2 mb-3">{hw.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#8a8073] flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {t('studentClass.problemCount', { count: taskCount })}
                        </span>
                        {solvable < taskCount && (
                          <span className="flex items-center gap-1 text-yellow-700">
                            <AlertTriangle size={12} /> {t('studentClass.solvableCount', { solvable, total: taskCount })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {formatVNFull(hw.deadline)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#bfae99] group-hover:text-[#193a2b] flex-shrink-0 mt-1 transition-colors" />
                  </div>

                  {/* Task completion progress bar */}
                  {taskCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#f0ebd9]">
                      <div className="flex items-center justify-between text-[11px] text-[#8a8073] mb-1">
                        <span>Tiến độ bài làm</span>
                        <span className="font-semibold text-[#191919]">{hwSolved}/{taskCount} ({hwPct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            hwPct === 100 ? 'bg-emerald-600' : 'bg-[#193a2b]'
                          }`}
                          style={{ width: `${hwPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
