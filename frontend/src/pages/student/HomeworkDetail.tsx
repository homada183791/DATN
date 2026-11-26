import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworkQuery } from '../../api/homeworks';
import { useSubmissionsQuery } from '../../api/submissions';
import { useProblemSkillMapQuery } from '../../api/skills';
import SkillChips from '../../components/skills/SkillChips';
import { formatVNFull, timeLeftWithinDay } from '../../utils/dateTime';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Play,
  Lock,
  AlertTriangle,
  Trophy,
  CheckCircle2,
} from 'lucide-react';

const diffChip: Record<string, string> = {
  Easy: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
  Medium: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
  Hard: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35',
};
const diffLabel: Record<string, string> = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

function deadlineInfo(deadline: string, t: (key: string, options?: Record<string, number>) => string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: t('deadline.closed'), chipClass: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)', closed: true };
  if (days <= 1) return { label: ((w) => t(w.key, { count: w.count }))(timeLeftWithinDay(diff)), chipClass: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35', closed: false };
  if (days <= 3) return { label: t('deadline.days', { count: days }), chipClass: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35', closed: false };
  return { label: t('deadline.days', { count: days }), chipClass: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35', closed: false };
}

export default function HomeworkDetail() {
  const { t } = useTranslation();
  const { data: skillMap = {} } = useProblemSkillMapQuery();
  const { classId, homeworkId } = useParams<{ classId: string; homeworkId: string }>();
  const navigate = useNavigate();

  const { data: homework, isLoading, isError } = useClassHomeworkQuery(classId, homeworkId);
  const { data: submissions = [] } = useSubmissionsQuery();

  const { solvedProblemIds, attemptedProblemIds } = useMemo(() => {
    const solved = new Set<string>();
    const attempted = new Set<string>();
    submissions.forEach((s) => {
      const status = s.status?.toUpperCase();
      if (status === 'ACCEPTED' || status === 'AC') {
        solved.add(s.problem_id);
      } else {
        attempted.add(s.problem_id);
      }
    });
    return { solvedProblemIds: solved, attemptedProblemIds: attempted };
  }, [submissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !homework) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="text-(--ws-faint) mx-auto mb-4" />
        <p className="font-semibold text-(--ws-text)">{t('studentContest.homeworkNotFound')}</p>
        <button onClick={() => navigate(`/student/class/${classId}`)} className="mt-4 text-sm text-(--ws-accent) hover:underline">
          {t('studentContest.backToClass')}
        </button>
      </div>
    );
  }

  const tasks = Array.isArray(homework.tasks) ? homework.tasks as Array<{
    id: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    points: number;
    statement: string;
    problem_id?: string;
  }> : [];

  const dl = deadlineInfo(homework.deadline, t);
  const totalPoints = tasks.reduce((s, t) => s + (t.points ?? 0), 0);
  const solvableCount = tasks.filter((t) => !!t.problem_id).length;

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-(--ws-muted) flex-wrap">
        <button onClick={() => navigate('/student/class')} className="hover:text-(--ws-accent) transition-colors">
          {t('studentContest.classLabel')}
        </button>
        <ChevronRight size={14} />
        <button onClick={() => navigate(`/student/class/${classId}`)} className="hover:text-(--ws-accent) transition-colors truncate max-w-[120px]">
          {homework.class?.name ?? t('studentContest.classLabel')}
        </button>
        <ChevronRight size={14} />
        <span className="text-(--ws-text) font-medium truncate max-w-[200px]">{homework.title}</span>
      </div>

      {/* Homework header */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${dl.chipClass}`}>
                {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}{dl.label}
              </span>
              <span className="text-xs text-(--ws-muted) bg-(--ws-panel2) px-2 py-0.5 rounded-full border border-(--ws-border)">
                {homework.class?.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-serif text-(--ws-text)">{homework.title}</h1>
            {homework.description && (
              <p className="text-sm text-(--ws-text) mt-2 leading-relaxed">{homework.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/student/class/${classId}`)}
            className="flex items-center gap-1.5 text-sm text-(--ws-muted) hover:text-(--ws-accent) transition-colors shrink-0"
          >
            <ArrowLeft size={14} /> {t('studentContest.back')}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm text-(--ws-muted) pt-4 border-t border-(--ws-border) flex-wrap">
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} /> {t('studentContest.problemCount', { count: tasks.length })}
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy size={14} /> {t('studentContest.pointsShort', { count: totalPoints })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {t('studentContest.deadlineLabel')}: {formatVNFull(homework.deadline)}
          </span>
        </div>
      </div>

      {/* Problem list */}
      <div>
        <h2 className="text-base font-bold text-(--ws-text) mb-3">
          {t('studentContest.classHomework')}
          {solvableCount < tasks.length && (
            <span className="ml-2 text-xs font-normal text-(--ws-warn) bg-(--ws-warn-soft) border border-(--ws-warn)/35 px-2 py-0.5 rounded-full">
              {t('studentContest.notLinkedCount', { count: tasks.length - solvableCount })}
            </span>
          )}
        </h2>

        {tasks.length === 0 ? (
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="font-semibold text-(--ws-text)">{t('studentContest.emptyProblems')}</p>
          </div>
        ) : (
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl overflow-hidden shadow-sm divide-y divide-(--ws-border)">
            {tasks.map((task, i) => {
              const canSolve = !!task.problem_id;
              const solveUrl = `/student/class/${classId}/homework/${homeworkId}/problem/${task.problem_id}`;
              const isSolved = !!(task.problem_id && solvedProblemIds.has(task.problem_id));
              const isAttempted = !!(task.problem_id && attemptedProblemIds.has(task.problem_id));
              const statementPreview = task.statement
                ?.replace(/^\s*\[\s*(?:Tiếng\s*Việt|English)\s*\]\s*/i, '')
                .slice(0, 80) ?? '';

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    canSolve ? 'hover:bg-(--ws-hover)' : 'opacity-70'
                  }`}
                >
                  {/* Index */}
                  <span className="text-sm font-mono text-(--ws-muted) w-6 shrink-0 text-center">
                    {i + 1}
                  </span>

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${canSolve ? 'text-(--ws-text)' : 'text-(--ws-text)'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-(--ws-muted) truncate mt-0.5">
                      {statementPreview}...
                    </p>
                    {task.problem_id && skillMap[task.problem_id] && (
                      <div className="mt-1.5">
                        <SkillChips codes={skillMap[task.problem_id]} />
                      </div>
                    )}
                  </div>

                  {/* Difficulty */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${diffChip[task.difficulty] ?? diffChip.Easy}`}>
                    {t(`problemForm.${diffLabel[task.difficulty] ?? 'easy'}`)}
                  </span>

                  {/* Points */}
                  <span className="text-xs text-(--ws-muted) w-12 text-right shrink-0 font-mono">
                    {t('studentContest.pointsShort', { count: task.points })}
                  </span>

                  {/* Action & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canSolve && (
                      isSolved ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-(--ws-ok-soft) text-(--ws-ok) border border-(--ws-ok)/35 text-xs font-semibold rounded-lg">
                          <CheckCircle2 size={12} className="text-(--ws-ok)" /> {t('studentHomework.completed')}
                        </span>
                      ) : isAttempted ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-(--ws-warn-soft) text-(--ws-warn) border border-(--ws-warn)/35 text-xs font-semibold rounded-lg">
                          <Clock size={12} className="text-(--ws-warn)" /> {t('studentContest.inProgress')}
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-(--ws-panel2) text-(--ws-muted) text-xs rounded-lg">
                          {t('studentContest.notSubmitted')}
                        </span>
                      )
                    )}
                    {canSolve && dl.closed ? (
                      <span className="flex items-center gap-1 px-3.5 py-1.5 bg-(--ws-panel2) text-(--ws-muted) text-xs rounded-xl cursor-not-allowed">
                        <Lock size={11} /> {t('studentContest.closed')}
                      </span>
                    ) : canSolve ? (
                      <Link
                        to={solveUrl}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                      >
                        <Play size={11} fill="white" /> {t('studentContest.solveTask')}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3.5 py-1.5 bg-(--ws-panel2) text-(--ws-muted) text-xs rounded-xl cursor-not-allowed">
                        <Lock size={11} /> {t('studentContest.noLink')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}