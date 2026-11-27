import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronRight, Search, Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/http';
import { useProblemsQuery, createProblem, updateProblem, deleteProblem, type ProblemDto, type CreateProblemDto } from '../../api/problems';
import { useAuth } from '../../context/AuthContext';
import ProblemFormModal from '../../components/ProblemFormModal';
import { getLocalizedProblemTitle, getLocalizedProblemDescription } from '../../utils/problemTranslation';

const difficultyStyles: Record<ProblemDto['difficulty'], string> = {
  EASY: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
  MEDIUM: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
  HARD: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
};

const difficultyOrder: Record<ProblemDto['difficulty'], number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type SortKey = 'default' | 'title_asc' | 'title_desc' | 'diff_asc' | 'diff_desc';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Mặc định' },
  { value: 'title_asc', label: 'Tên A → Z' },
  { value: 'title_desc', label: 'Tên Z → A' },
  { value: 'diff_asc', label: 'Dễ → Khó' },
  { value: 'diff_desc', label: 'Khó → Dễ' },
];

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

export default function ProblemList() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProblemsQuery();

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | ProblemDto['difficulty']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProblemDto | null>(null);
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

  const createMutation = useMutation({
    mutationFn: createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.createError'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<CreateProblemDto> }) => updateProblem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.updateError'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : t('problemList.deleteError'));
    }
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
      return matchesSearch && matchesDifficulty;
    });

    // Sắp xếp
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
  }, [data, difficulty, query, sortKey, currentLang]);

  const handleOpenCreateModal = () => {
    setEditingProblem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, problem: ProblemDto) => {
    e.preventDefault();
    setEditingProblem(problem);
    setIsModalOpen(true);
  };

  const handleDeleteProblem = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (window.confirm(t('problemList.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
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
      <div className="space-y-6 text-(--ws-text)">
        <div>
          <h2 className="text-3xl font-bold font-serif text-(--ws-text)">{t('problemList.titleInstructor')}</h2>
          <p className="text-sm text-(--ws-muted) mt-1">{t('problemList.loading')}</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-5 py-4 shadow-sm">
              <div className="h-4 w-48 rounded ws-skeleton" />
              <div className="mt-3 h-3 w-72 max-w-full rounded ws-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-10 text-center shadow-sm">
        <BookOpen size={44} className="text-(--ws-faint) mx-auto mb-3" />
        <h2 className="text-xl font-bold text-(--ws-text)">{t('problemList.loadError')}</h2>
        <p className="mt-2 text-sm text-(--ws-muted)">{error.message}</p>
      </div>
    );
  }

  const totalCount = (data ?? []).length;

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-serif text-(--ws-text)">
            {isInstructor ? t('problemList.titleInstructor') : t('problemList.titleStudent')}
          </h2>
          <p className="text-sm text-(--ws-muted) mt-1">
            {t('problemList.shownCount', { visible: filteredProblems.length, total: totalCount })}
          </p>
        </div>
        {isInstructor && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-xl bg-(--ws-accent) px-4 py-2 text-sm font-medium text-(--ws-on-accent) shadow-sm hover:bg-(--ws-accent-strong) transition-colors"
          >
            <Plus size={16} /> {t('problemList.createBtn')}
          </button>
        )}
      </div>

      {/* Search + Filters + Sort */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('problemList.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) outline-none placeholder:text-(--ws-faint) focus:ring-2 focus:ring-(--ws-accent) focus:border-(--ws-accent)"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider">{t('problemList.difficultyFilter')}</span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={difficulty === level}
                  onClick={() => setDifficulty(level)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    difficulty === level
                      ? level === 'all' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm'
                        : level === 'EASY' ? 'bg-(--ws-ok) text-(--ws-on-accent) shadow-sm'
                        : level === 'MEDIUM' ? 'bg-(--ws-warn) text-(--ws-on-accent) shadow-sm'
                        : 'bg-(--ws-danger) text-(--ws-on-accent) shadow-sm'
                      : 'bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-hover)'
                  }`}
                >
                  {level === 'all' ? t('problemList.all') : difficultyLabels[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-(--ws-border) hidden sm:block" />

          {/* Sort */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ArrowUpDown size={13} className="text-(--ws-muted)" aria-hidden="true" />
            <span className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider">{t('problemList.sortLabel')}</span>
            <div className="flex flex-wrap gap-1.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={sortKey === opt.value}
                  onClick={() => setSortKey(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    sortKey === opt.value
                      ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm'
                      : 'bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-hover)'
                  }`}
                >
                  {sortLabels[opt.value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Problem list */}
      <div className="space-y-2.5">
        {filteredProblems.map((problem) => {
          const locTitle = getLocalizedProblemTitle(problem.title, currentLang);
          const locDesc = getLocalizedProblemDescription(problem.description, currentLang);
          const targetPath = isInstructor ? `/instructor/problem/${problem.id}` : `/student/problem/${problem.id}`;
          return (
            <div
              key={problem.id}
              className="group flex flex-col gap-3 rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-5 py-4 shadow-sm transition-all hover:border-(--ws-accent)/40 hover:bg-(--ws-hover)/40 sm:flex-row sm:items-center"
            >
              <Link to={targetPath} className="flex-1 min-w-0 block rounded-lg focus-visible:outline-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-(--ws-text) group-hover:text-(--ws-accent) transition-colors">{locTitle}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${difficultyStyles[problem.difficulty]}`}>
                    {difficultyLabels[problem.difficulty]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-(--ws-muted)">{markdownToPlainText(locDesc)}</p>
              </Link>
              <div className="flex items-center gap-4 text-sm text-(--ws-muted) shrink-0">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-semibold font-mono tabular-nums text-(--ws-text)">{problem.time_limit} ms</span>
                  <span className="text-[10px] text-(--ws-faint)">{t('problemList.timeLabel')}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-semibold font-mono tabular-nums text-(--ws-text)">{problem.memory_limit} MB</span>
                  <span className="text-[10px] text-(--ws-faint)">{t('problemList.memoryLabel')}</span>
                </div>
                <span className="hidden sm:inline text-[11px] font-mono font-bold tracking-wider text-(--ws-muted) bg-(--ws-panel2) border border-(--ws-border) rounded-md px-2 py-1">
                  {problem.id.slice(0, 8)}…
                </span>
                {isInstructor && (
                  <div className="flex items-center gap-1 border-l border-(--ws-border) pl-3">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(e, problem)}
                      className="p-2 rounded-lg text-(--ws-muted) hover:text-(--ws-accent) hover:bg-(--ws-hover) transition-colors"
                      title={t('problemList.editTitle')}
                      aria-label={t('problemList.editTitle')}
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProblem(e, problem.id)}
                      className="p-2 rounded-lg text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) transition-colors disabled:opacity-50"
                      disabled={deleteMutation.isPending}
                      title={t('problemList.deleteTitle')}
                      aria-label={t('problemList.deleteTitle')}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <Link
                  to={targetPath}
                  aria-label={locTitle}
                  className="p-1 rounded-lg text-(--ws-faint) group-hover:text-(--ws-accent) transition-colors"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredProblems.length === 0 && (
          <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-12 text-center shadow-sm">
            <BookOpen size={44} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="font-semibold text-(--ws-text)">{t('problemList.noProblemsTitle')}</p>
            <p className="text-sm text-(--ws-muted) mt-1">
              {query ? t('problemList.searchNoResults', { query }) : t('problemList.noProblemsSubtitle')}
            </p>
          </div>
        )}
      </div>

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
