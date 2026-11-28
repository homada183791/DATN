import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Check,
  CircleDot,
  Minus,
  Shuffle,
  AlignLeft,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/http';
import { useProblemsQuery, createProblem, updateProblem, deleteProblem, type ProblemDto, type CreateProblemDto } from '../../api/problems';
import { useSubmissionsQuery } from '../../api/submissions';
import { useContestsQuery } from '../../api/contests';
import { useAuth } from '../../context/AuthContext';
import ProblemFormModal from '../../components/ProblemFormModal';
import { getLocalizedProblemTitle, getLocalizedProblemDescription } from '../../utils/problemTranslation';

const difficultyStyles: Record<ProblemDto['difficulty'], string> = {
  EASY: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/30',
  MEDIUM: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/30',
  HARD: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/30',
};

const difficultyOrder: Record<ProblemDto['difficulty'], number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type SortKey = 'default' | 'title_asc' | 'title_desc' | 'diff_asc' | 'diff_desc';
type StatusFilter = 'all' | 'todo' | 'attempted' | 'solved';
type ProblemSolveStatus = 'todo' | 'attempted' | 'solved';

const sortOptions: SortKey[] = ['default', 'title_asc', 'title_desc', 'diff_asc', 'diff_desc'];

/** Đoạn xem trước trong danh sách: bỏ ký hiệu markdown (**, `, #, link, $...$) để không hiện chữ thô. */
function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~|`)(?=\S)([^\n]*?\S)\1/g, '$2')
    .replace(/\$+([^$]+)\$+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCountdownShort(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ProblemList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProblemsQuery();
  const { data: submissions = [] } = useSubmissionsQuery();
  const { data: contests = [] } = useContestsQuery();

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | ProblemDto['difficulty']>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [showPreview, setShowPreview] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProblemDto | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const nextContest = useMemo(() => {
    const running = contests.find((c) => c.status === 'running');
    if (running) return running;
    return contests
      .filter((c) => c.status === 'upcoming')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [contests]);

  useEffect(() => {
    if (!nextContest || isInstructor) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nextContest, isInstructor]);

  const difficultyLabels: Record<ProblemDto['difficulty'], string> = {
    EASY: t('instructorHomework.difficultyEasyFull'),
    MEDIUM: t('instructorHomework.difficultyMediumFull'),
    HARD: t('instructorHomework.difficultyHard'),
  };
  const sortLabels: Record<SortKey, string> = {
    default: t('problemList.sortDefault'),
    title_asc: t('problemList.sortTitleAsc'),
    title_desc: t('problemList.sortTitleDesc'),
    diff_asc: t('problemList.sortDifficultyAsc'),
    diff_desc: t('problemList.sortDifficultyDesc'),
  };

  const problemStatusMap = useMemo(() => {
    const map = new Map<string, ProblemSolveStatus>();
    for (const sub of submissions) {
      const prev = map.get(sub.problem_id);
      if (sub.status === 'ACCEPTED') {
        map.set(sub.problem_id, 'solved');
      } else if (prev !== 'solved') {
        map.set(sub.problem_id, 'attempted');
      }
    }
    return map;
  }, [submissions]);

  const progressByDifficulty = useMemo(() => {
    const counts: Record<ProblemDto['difficulty'], { total: number; solved: number }> = {
      EASY: { total: 0, solved: 0 },
      MEDIUM: { total: 0, solved: 0 },
      HARD: { total: 0, solved: 0 },
    };
    for (const p of data ?? []) {
      counts[p.difficulty].total += 1;
      if (problemStatusMap.get(p.id) === 'solved') {
        counts[p.difficulty].solved += 1;
      }
    }
    return counts;
  }, [data, problemStatusMap]);

  const createMutation = useMutation({
    mutationFn: createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProblemDto> }) => updateProblem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.deleteError'));
    },
  });

  const filteredProblems = useMemo(() => {
    const search = query.trim().toLowerCase();
    let list = (data ?? []).filter((problem) => {
      const locTitle = getLocalizedProblemTitle(problem.title, currentLang).toLowerCase();
      const locDesc = getLocalizedProblemDescription(problem.description, currentLang).toLowerCase();
      const rawTitle = (problem.title ?? '').toLowerCase();
      const rawDesc = (problem.description ?? '').toLowerCase();
      const rawId = (problem.id ?? '').toLowerCase();

      const matchesSearch =
        !search ||
        locTitle.includes(search) ||
        rawTitle.includes(search) ||
        locDesc.includes(search) ||
        rawDesc.includes(search) ||
        rawId.includes(search);

      const matchesDifficulty = difficulty === 'all' || problem.difficulty === difficulty;
      const status = problemStatusMap.get(problem.id) ?? 'todo';
      const matchesStatus = isInstructor || statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesDifficulty && matchesStatus;
    });

    if (sortKey === 'title_asc') {
      list = [...list].sort((a, b) =>
        getLocalizedProblemTitle(a.title, currentLang).localeCompare(getLocalizedProblemTitle(b.title, currentLang), currentLang),
      );
    } else if (sortKey === 'title_desc') {
      list = [...list].sort((a, b) =>
        getLocalizedProblemTitle(b.title, currentLang).localeCompare(getLocalizedProblemTitle(a.title, currentLang), currentLang),
      );
    } else if (sortKey === 'diff_asc') {
      list = [...list].sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    } else if (sortKey === 'diff_desc') {
      list = [...list].sort((a, b) => difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]);
    }

    return list;
  }, [data, difficulty, statusFilter, isInstructor, problemStatusMap, query, sortKey, currentLang]);

  const handleOpenCreateModal = () => {
    setEditingProblem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, problem: ProblemDto) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProblem(problem);
    setIsModalOpen(true);
  };

  const handleDeleteProblem = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(t('problemList.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handlePickRandom = () => {
    if (filteredProblems.length === 0) return;
    const pool = filteredProblems.filter((p) => (problemStatusMap.get(p.id) ?? 'todo') !== 'solved');
    const candidates = pool.length > 0 ? pool : filteredProblems;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    navigate(isInstructor ? `/instructor/problem/${picked.id}` : `/student/problem/${picked.id}`);
  };

  const handleModalSubmit = (data: CreateProblemDto) => {
    if (editingProblem) {
      updateMutation.mutate({ id: editingProblem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-(--ws-text)">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 rounded ws-skeleton" />
            <div className="mt-1.5 h-3.5 w-36 rounded ws-skeleton" />
          </div>
        </div>
        <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) overflow-hidden">
          <div className="h-10 border-b border-(--ws-border) bg-(--ws-panel2)/60 px-3 flex items-center gap-3">
            <div className="h-3.5 w-6 rounded ws-skeleton" />
            <div className="h-3.5 w-48 rounded ws-skeleton" />
            <div className="ml-auto h-3.5 w-28 rounded ws-skeleton" />
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-11 border-b last:border-b-0 border-(--ws-border-soft) px-3 flex items-center gap-3">
              <div className="h-4 w-4 rounded ws-skeleton" />
              <div className="h-3.5 w-16 rounded ws-skeleton" />
              <div className="h-3.5 flex-1 max-w-sm rounded ws-skeleton" />
              <div className="ml-auto h-5 w-16 rounded ws-skeleton" />
              <div className="h-3.5 w-14 rounded ws-skeleton" />
              <div className="h-3.5 w-14 rounded ws-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) p-10 text-center">
        <BookOpen size={36} className="text-(--ws-faint) mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-(--ws-text)">{t('problemList.loadError')}</h2>
        <p className="mt-1.5 text-sm text-(--ws-muted)">{error.message}</p>
      </div>
    );
  }

  const totalCount = (data ?? []).length;
  const totalSolved =
    progressByDifficulty.EASY.solved + progressByDifficulty.MEDIUM.solved + progressByDifficulty.HARD.solved;

  const mainTable = (
    <div className="space-y-3 min-w-0">
      {/* Compact single-row filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-(--ws-border) bg-(--ws-panel) p-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('problemList.searchPlaceholder')}
            aria-label={t('problemList.searchPlaceholder')}
            className="w-full h-8 pl-8 pr-3 bg-(--ws-panel2) border border-(--ws-border) rounded text-[13px] text-(--ws-text) outline-none placeholder:text-(--ws-faint) focus:border-(--ws-accent)"
          />
        </div>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'all' | ProblemDto['difficulty'])}
          aria-label={t('problemList.difficultyLabel')}
          className="h-8 px-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded text-xs font-medium text-(--ws-text) focus:outline-none focus:border-(--ws-accent)"
        >
          <option value="all">{t('problemList.difficultyLabel')}: {t('problemList.all')}</option>
          <option value="EASY">{difficultyLabels.EASY}</option>
          <option value="MEDIUM">{difficultyLabels.MEDIUM}</option>
          <option value="HARD">{difficultyLabels.HARD}</option>
        </select>

        {!isInstructor && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label={t('problemList.statusLabel')}
            className="h-8 px-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded text-xs font-medium text-(--ws-text) focus:outline-none focus:border-(--ws-accent)"
          >
            <option value="all">{t('problemList.statusAll')}</option>
            <option value="todo">{t('problemList.statusTodo')}</option>
            <option value="attempted">{t('problemList.statusAttempted')}</option>
            <option value="solved">{t('problemList.statusSolved')}</option>
          </select>
        )}

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label={t('problemList.sortLabel')}
          className="h-8 px-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded text-xs font-medium text-(--ws-text) focus:outline-none focus:border-(--ws-accent)"
        >
          {sortOptions.map((opt) => (
            <option key={opt} value={opt}>
              {sortLabels[opt]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          aria-pressed={showPreview}
          title={showPreview ? t('problemList.hidePreview') : t('problemList.showPreview')}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded border text-xs font-medium transition-colors ${
            showPreview
              ? 'border-(--ws-accent) bg-(--ws-accent-soft) text-(--ws-accent)'
              : 'border-(--ws-border) bg-(--ws-panel2) text-(--ws-muted) hover:text-(--ws-text)'
          }`}
        >
          <AlignLeft size={13} aria-hidden="true" />
          <span className="hidden sm:inline">{showPreview ? t('problemList.hidePreview') : t('problemList.showPreview')}</span>
        </button>

        {!isInstructor && (
          <button
            type="button"
            onClick={handlePickRandom}
            disabled={filteredProblems.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-(--ws-border) bg-(--ws-panel2) text-xs font-medium text-(--ws-text) hover:border-(--ws-accent) hover:text-(--ws-accent) disabled:opacity-45 transition-colors"
          >
            <Shuffle size={13} aria-hidden="true" />
            <span>{t('problemList.pickRandom')}</span>
          </button>
        )}
      </div>

      {/* High-density data table */}
      <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-9 border-b border-(--ws-border) bg-(--ws-panel2)/70 text-[11px] font-semibold uppercase tracking-wider text-(--ws-muted)">
                {!isInstructor && (
                  <th scope="col" className="w-10 px-3 py-2 text-center">
                    {t('problemList.colStatus')}
                  </th>
                )}
                <th scope="col" className="px-3 py-2">
                  {t('problemList.colProblem')}
                </th>
                <th scope="col" className="w-28 px-3 py-2">
                  {t('problemList.difficultyLabel')}
                </th>
                <th scope="col" className="w-24 px-3 py-2 text-right hidden sm:table-cell">
                  {t('problemList.timeLabel')}
                </th>
                <th scope="col" className="w-24 px-3 py-2 text-right hidden sm:table-cell">
                  {t('problemList.memoryLabel')}
                </th>
                {isInstructor && (
                  <th scope="col" className="w-24 px-3 py-2 text-right">
                    {t('problemList.colActions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((problem) => {
                const locTitle = getLocalizedProblemTitle(problem.title, currentLang);
                const locDesc = getLocalizedProblemDescription(problem.description, currentLang);
                const targetPath = isInstructor ? `/instructor/problem/${problem.id}` : `/student/problem/${problem.id}`;
                const status = problemStatusMap.get(problem.id) ?? 'todo';

                return (
                  <tr
                    key={problem.id}
                    className="group border-b last:border-b-0 border-(--ws-border-soft) hover:bg-(--ws-hover) transition-colors"
                  >
                    {!isInstructor && (
                      <td className="px-3 py-2 text-center align-middle">
                        {status === 'solved' ? (
                          <span
                            className="inline-flex items-center justify-center text-(--ws-ok)"
                            title={t('problemList.statusSolved')}
                            aria-label={t('problemList.statusSolved')}
                          >
                            <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                          </span>
                        ) : status === 'attempted' ? (
                          <span
                            className="inline-flex items-center justify-center text-(--ws-warn)"
                            title={t('problemList.statusAttempted')}
                            aria-label={t('problemList.statusAttempted')}
                          >
                            <CircleDot size={14} aria-hidden="true" />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center text-(--ws-faint)"
                            title={t('problemList.statusTodo')}
                            aria-label={t('problemList.statusTodo')}
                          >
                            <Minus size={12} aria-hidden="true" />
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 align-middle min-w-0">
                      <Link
                        to={targetPath}
                        className="flex items-baseline gap-2 min-w-0 rounded focus-visible:outline-2"
                      >
                        <span className="shrink-0 font-mono tabular-nums text-[11px] text-(--ws-faint)">
                          {problem.id.slice(0, 6)}
                        </span>
                        <span className="truncate text-[13.5px] font-medium text-(--ws-text) group-hover:text-(--ws-accent) transition-colors">
                          {locTitle}
                        </span>
                      </Link>
                      {showPreview && locDesc && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-(--ws-muted)">
                          {markdownToPlainText(locDesc)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${difficultyStyles[problem.difficulty]}`}
                      >
                        {difficultyLabels[problem.difficulty]}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-right font-mono tabular-nums text-xs text-(--ws-muted) whitespace-nowrap hidden sm:table-cell">
                      {problem.time_limit} ms
                    </td>
                    <td className="px-3 py-2 align-middle text-right font-mono tabular-nums text-xs text-(--ws-muted) whitespace-nowrap hidden sm:table-cell">
                      {problem.memory_limit} MB
                    </td>
                    {isInstructor && (
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(e, problem)}
                            className="p-1.5 rounded text-(--ws-muted) hover:text-(--ws-accent) hover:bg-(--ws-panel2) transition-colors"
                            title={t('problemList.editTitle')}
                            aria-label={t('problemList.editTitle')}
                          >
                            <Edit size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProblem(e, problem.id)}
                            className="p-1.5 rounded text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) transition-colors disabled:opacity-50"
                            disabled={deleteMutation.isPending}
                            title={t('problemList.deleteTitle')}
                            aria-label={t('problemList.deleteTitle')}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProblems.length === 0 && (
          <div className="p-10 text-center">
            <BookOpen size={36} className="text-(--ws-faint) mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-(--ws-text)">{t('problemList.noProblemsTitle')}</p>
            <p className="text-xs text-(--ws-muted) mt-1">
              {query ? t('problemList.searchNoResults', { query }) : t('problemList.noProblemsSubtitle')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 text-(--ws-text)">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">
            {isInstructor ? t('problemList.titleInstructor') : t('problemList.titleStudent')}
          </h2>
          <span className="text-xs font-mono tabular-nums text-(--ws-muted)">
            {t('problemList.shownCount', { visible: filteredProblems.length, total: totalCount })}
          </span>
        </div>
        {isInstructor && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded bg-(--ws-accent) px-3.5 py-2 text-xs font-semibold text-(--ws-on-accent) hover:bg-(--ws-accent-strong) transition-colors"
          >
            <Plus size={14} aria-hidden="true" /> {t('problemList.createBtn')}
          </button>
        )}
      </div>

      {isInstructor ? (
        mainTable
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_272px] items-start">
          {mainTable}

          {/* Compact Utility Sidebar */}
          <aside className="space-y-3">
            {/* Progress by difficulty */}
            <section className="rounded-md border border-(--ws-border) bg-(--ws-panel) p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--ws-muted)">
                  {t('studentHomework.progress')}
                </h3>
                <span className="font-mono tabular-nums text-xs font-semibold text-(--ws-text)">
                  {totalSolved}/{totalCount}
                </span>
              </div>
              <div className="space-y-2.5">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((lvl) => {
                  const stat = progressByDifficulty[lvl];
                  const pct = stat.total > 0 ? Math.round((stat.solved / stat.total) * 100) : 0;
                  const barColor =
                    lvl === 'EASY' ? 'bg-(--ws-ok)' : lvl === 'MEDIUM' ? 'bg-(--ws-warn)' : 'bg-(--ws-danger)';
                  return (
                    <div key={lvl} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-(--ws-text)">{difficultyLabels[lvl]}</span>
                        <span className="font-mono tabular-nums text-(--ws-muted)">
                          {stat.solved}/{stat.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-sm bg-(--ws-panel2) overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Compact Upcoming / Running Contest Widget */}
            {nextContest && (
              <section className="rounded-md border border-(--ws-border) bg-(--ws-panel) p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-(--ws-muted)">
                    <Clock size={12} aria-hidden="true" />
                    {nextContest.status === 'running' ? t('studentDashboard.statusRunning') : t('widgets.upcoming')}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                      nextContest.status === 'running'
                        ? 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/30'
                        : 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/30'
                    }`}
                  >
                    {nextContest.type ?? 'Contest'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-(--ws-text) leading-snug">{nextContest.title}</p>
                <div className="font-mono tabular-nums text-base font-bold text-(--ws-accent)">
                  {formatCountdownShort(
                    new Date(nextContest.status === 'running' ? nextContest.endTime : nextContest.startTime).getTime() - nowMs,
                  )}
                </div>
                <Link
                  to={`/student/contest?open=${nextContest.id}`}
                  className="inline-flex items-center justify-center gap-1.5 w-full h-8 rounded border border-(--ws-border) bg-(--ws-panel2) text-xs font-semibold text-(--ws-text) hover:border-(--ws-accent) hover:text-(--ws-accent) transition-colors"
                >
                  {nextContest.status === 'running' ? t('studentContest.enterNow') : t('widgets.contestDetails')}
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </section>
            )}
          </aside>
        </div>
      )}

      <ProblemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingProblem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
