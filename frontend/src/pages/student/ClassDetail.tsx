import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworksQuery } from '../../api/homeworks';
import { useClassesQuery } from '../../api/classes';
import { useMemo } from 'react';
import { formatVNFull, timeLeftWithinDay } from '../../utils/dateTime';
import { useTranslation } from 'react-i18next';

function deadlineInfo(deadline: string, t: (key: string, options?: Record<string, number>) => string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: t('deadline.closed'), color: 'text-(--ws-muted)', chipClass: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)', closed: true };
  if (days <= 1) return { label: ((w) => t(w.key, { count: w.count }))(timeLeftWithinDay(diff)), color: 'text-(--ws-danger)', chipClass: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35', closed: false };
  if (days <= 3) return { label: t('deadline.days', { count: days }), color: 'text-(--ws-warn)', chipClass: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35', closed: false };
  return { label: t('deadline.days', { count: days }), color: 'text-(--ws-ok)', chipClass: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35', closed: false };
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
} from 'lucide-react';

export default function StudentClassDetail() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: apiClasses = [], isLoading: classLoading } = useClassesQuery();
  const { data: homeworks = [], isLoading: hwLoading } = useClassHomeworksQuery(classId);

  const classInfo = useMemo(
    () => apiClasses.find((c) => c.id === classId),
    [apiClasses, classId]
  );

  const activeCount = homeworks.filter((hw) => {
    const d = deadlineInfo(hw.deadline, t);
    return !d.closed;
  }).length;

  const isLoading = classLoading || hwLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={48} className="text-(--ws-faint) mx-auto mb-4" />
        <p className="font-semibold text-(--ws-text)">{t('studentContest.notFoundClass')}</p>
        <button onClick={() => navigate('/student/class')} className="mt-4 text-sm text-(--ws-accent) hover:underline">
          {t('studentContest.backToClasses')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-(--ws-muted)">
        <button onClick={() => navigate('/student/class')} className="hover:text-(--ws-accent) transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> {t('studentContest.classLabel')}
        </button>
      </div>

      {/* Class header */}
      <div className="bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-2xl p-6 text-(--ws-on-accent) shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={20} className="shrink-0 opacity-80" />
              <span className="text-sm opacity-75">{classInfo.semester}</span>
            </div>
            <h1 className="text-2xl font-bold font-serif mb-1">{classInfo.subject ? `${classInfo.subject} - ${classInfo.name}` : classInfo.name}</h1>
            {classInfo.description && (
              <p className="text-sm opacity-80 line-clamp-2 mt-1">{classInfo.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-(--ws-panel)/20 text-sm">
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

      {/* Homework list */}
      <div>
        <h2 className="text-lg font-bold font-serif text-(--ws-text) mb-4">{t('studentClass.homeworkList')}</h2>

        {homeworks.length === 0 ? (
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="font-semibold text-(--ws-text)">{t('studentClass.emptyHomework')}</p>
            <p className="text-sm text-(--ws-muted) mt-1">{t('studentClass.teacherNoHomework')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {homeworks.map((hw) => {
              const dl = deadlineInfo(hw.deadline, t);
              const hwTasks = Array.isArray(hw.tasks) ? hw.tasks : [];
              const taskCount = hwTasks.length;
              const solvable = (hwTasks as Array<{ problem_id?: string }>).filter((t) => !!t.problem_id).length;

              return (
                <Link
                  key={hw.id}
                  to={`/student/class/${classId}/homework/${hw.id}`}
                  className="block bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 hover:shadow-md hover:border-(--ws-accent)/30 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-(--ws-text) group-hover:text-(--ws-accent) transition-colors">
                          {hw.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${dl.chipClass}`}>
                          {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}
                          {dl.label}
                        </span>
                      </div>
                      {hw.description && (
                        <p className="text-sm text-(--ws-text) line-clamp-2 mb-3">{hw.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-(--ws-muted) flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {t('studentClass.problemCount', { count: taskCount })}
                        </span>
                        {solvable < taskCount && (
                          <span className="flex items-center gap-1 text-(--ws-warn)">
                            <AlertTriangle size={12} /> {t('studentClass.solvableCount', { solvable, total: taskCount })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {formatVNFull(hw.deadline)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-(--ws-faint) group-hover:text-(--ws-accent) shrink-0 mt-1 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}