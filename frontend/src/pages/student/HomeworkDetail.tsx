import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClassHomeworkQuery } from '../../api/homeworks';
import { useSubmissionsQuery } from '../../api/submissions';
import { formatVNFull } from '../../utils/dateTime';
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
  Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Hard: 'bg-red-100 text-red-800 border-red-200',
};
const diffLabel: Record<string, string> = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

function deadlineInfo(deadline: string, t: (key: string, options?: Record<string, number>) => string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  const days = Math.ceil(diff / 86_400_000);
  if (diff < 0) return { label: t('deadline.closed'), chipClass: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]', closed: true };
  if (days <= 1) return { label: t('deadline.lessThanDay'), chipClass: 'bg-red-50 text-red-700 border-red-200', closed: false };
  if (days <= 3) return { label: t('deadline.days', { count: days }), chipClass: 'bg-yellow-50 text-yellow-800 border-yellow-200', closed: false };
  return { label: t('deadline.days', { count: days }), chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', closed: false };
}

export default function HomeworkDetail() {
  const { t } = useTranslation();
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
        <div className="w-8 h-8 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !homework) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="text-[#bfae99] mx-auto mb-4" />
        <p className="font-semibold text-[#191919]">{t('studentContest.homeworkNotFound')}</p>
        <button onClick={() => navigate(`/student/class/${classId}`)} className="mt-4 text-sm text-[#193a2b] hover:underline">
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
  const completedCount = tasks.filter((t) => t.problem_id && solvedProblemIds.has(t.problem_id)).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8a8073] flex-wrap">
        <button onClick={() => navigate('/student/class')} className="hover:text-[#193a2b] transition-colors">
          {t('studentContest.classLabel')}
        </button>
        <ChevronRight size={14} />
        <button onClick={() => navigate(`/student/class/${classId}`)} className="hover:text-[#193a2b] transition-colors truncate max-w-[120px]">
          {homework.class?.name ?? t('studentContest.classLabel')}
        </button>
        <ChevronRight size={14} />
        <span className="text-[#191919] font-medium truncate max-w-[200px]">{homework.title}</span>
      </div>

      {/* Homework header */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${dl.chipClass}`}>
                {dl.closed ? <Lock size={10} className="inline mr-1" /> : null}{dl.label}
              </span>
              <span className="text-xs text-[#8a8073] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#e5dac9]">
                {homework.class?.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-serif text-[#191919]">{homework.title}</h1>
            {homework.description && (
              <p className="text-sm text-[#5c5446] mt-2 leading-relaxed">{homework.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/student/class/${classId}`)}
            className="flex items-center gap-1.5 text-sm text-[#8a8073] hover:text-[#193a2b] transition-colors shrink-0"
          >
            <ArrowLeft size={14} /> {t('studentContest.back')}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm text-[#8a8073] pt-4 border-t border-[#f0ebd9] flex-wrap">
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} /> {t('studentContest.problemCount', { count: tasks.length })}
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy size={14} /> {totalPoints} điểm
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {t('studentContest.deadlineLabel')}: {formatVNFull(homework.deadline)}
          </span>
        </div>
      </div>

      {/* Progress banner */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#193a2b]" />
            <span className="font-bold text-sm text-[#191919]">Tiến độ bài tập của bạn</span>
          </div>
          <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
            progressPct === 100
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : progressPct > 0
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]'
          }`}>
            {completedCount}/{tasks.length} bài ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#f0ebd9] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              progressPct === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-[#193a2b]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-[#8a8073] mt-2">
          {completedCount === tasks.length && tasks.length > 0
            ? '🎉 Xuất sắc! Bạn đã hoàn thành 100% tất cả các bài toán trong bài tập này!'
            : `Bạn đã giải quyết thành công ${completedCount}/${tasks.length} bài toán. Hãy hoàn thành các bài còn lại trước hạn nộp!`}
        </p>
      </div>

      {/* Problem list */}
      <div>
        <h2 className="text-base font-bold text-[#191919] mb-3">
          {t('studentContest.classHomework')}
          {solvableCount < tasks.length && (
            <span className="ml-2 text-xs font-normal text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
              {t('studentContest.notLinkedCount', { count: tasks.length - solvableCount })}
            </span>
          )}
        </h2>

        {tasks.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
            <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">{t('studentContest.emptyProblems')}</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f0ebd9]">
            {tasks.map((task, i) => {
              const canSolve = !!task.problem_id;
              const solveUrl = `/student/class/${classId}/homework/${homeworkId}/problem/${task.problem_id}`;
              const isSolved = !!(task.problem_id && solvedProblemIds.has(task.problem_id));
              const isAttempted = !!(task.problem_id && attemptedProblemIds.has(task.problem_id));

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    canSolve ? 'hover:bg-[#f7f4eb]' : 'opacity-70'
                  }`}
                >
                  {/* Index */}
                  <span className="text-sm font-mono text-[#8a8073] w-6 shrink-0 text-center">
                    {String.fromCharCode(65 + i)}
                  </span>

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${canSolve ? 'text-[#191919]' : 'text-[#5c5446]'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-[#8a8073] truncate mt-0.5">
                      {task.statement?.slice(0, 80) ?? ''}...
                    </p>
                  </div>

                  {/* Difficulty */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${diffChip[task.difficulty] ?? diffChip.Easy}`}>
                    {t(`problemForm.${diffLabel[task.difficulty] ?? 'easy'}`)}
                  </span>

                  {/* Points */}
                  <span className="text-xs text-[#8a8073] w-12 text-right shrink-0 font-mono">
                    {task.points}đ
                  </span>

                  {/* Action & Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canSolve && (
                      isSolved ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Đã hoàn thành
                        </span>
                      ) : isAttempted ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg">
                          <Clock size={12} className="text-amber-600" /> Đang làm dở
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-[#f0ebd9] text-[#8a8073] text-xs rounded-lg">
                          Chưa nộp
                        </span>
                      )
                    )}
                    {canSolve ? (
                      <Link
                        to={solveUrl}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
                      >
                        <Play size={11} fill="white" /> {t('studentContest.solveTask')}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3.5 py-1.5 bg-[#f0ebd9] text-[#8a8073] text-xs rounded-xl cursor-not-allowed">
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
