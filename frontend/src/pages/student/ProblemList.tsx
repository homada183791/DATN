import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Search, Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/http';
import { useProblemsQuery, createProblem, updateProblem, deleteProblem, type ProblemDto, type CreateProblemDto } from '../../api/problems';
import { useAuth } from '../../context/AuthContext';
import ProblemFormModal from '../../components/ProblemFormModal';

const difficultyLabels: Record<ProblemDto['difficulty'], string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
};

const difficultyStyles: Record<ProblemDto['difficulty'], string> = {
  EASY: 'text-emerald-800 bg-emerald-100 border-emerald-200',
  MEDIUM: 'text-yellow-800 bg-yellow-100 border-yellow-200',
  HARD: 'text-red-800 bg-red-100 border-red-200',
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

export default function ProblemList() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProblemsQuery();

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | ProblemDto['difficulty']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProblemDto | null>(null);

  const createMutation = useMutation({
    mutationFn: createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : 'Lỗi khi tạo bài tập');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<CreateProblemDto> }) => updateProblem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : 'Lỗi khi cập nhật bài tập');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : 'Lỗi khi xóa bài tập');
    }
  });

  const filteredProblems = useMemo(() => {
    const search = query.trim().toLowerCase();
    let list = (data ?? []).filter((problem) => {
      const matchesSearch =
        !search ||
        (problem.title ?? '').toLowerCase().includes(search) ||
        (problem.id ?? '').toLowerCase().includes(search) ||
        (problem.description ?? '').toLowerCase().includes(search);
      const matchesDifficulty = difficulty === 'all' || problem.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });

    // Sắp xếp
    if (sortKey === 'title_asc') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    else if (sortKey === 'title_desc') list = [...list].sort((a, b) => b.title.localeCompare(a.title, 'vi'));
    else if (sortKey === 'diff_asc') list = [...list].sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    else if (sortKey === 'diff_desc') list = [...list].sort((a, b) => difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]);

    return list;
  }, [data, difficulty, query, sortKey]);

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
    if (window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
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
      <div className="space-y-6 text-[#191919]">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">Ngân hàng bài toán</h2>
          <p className="text-sm text-[#8a8073] mt-1">Đang tải danh sách bài toán...</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-[#e5dac9] bg-white px-5 py-4 shadow-sm">
              <div className="h-4 w-48 rounded bg-[#f0ebd9] animate-pulse" />
              <div className="mt-3 h-3 w-72 rounded bg-[#f0ebd9] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <BookOpen size={44} className="text-[#bfae99] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#191919]">Không thể tải danh sách bài tập</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{error.message}</p>
      </div>
    );
  }

  const totalCount = (data ?? []).length;

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">
            {isInstructor ? 'Ngân hàng bài toán' : 'Bài toán'}
          </h2>
          <p className="text-sm text-[#8a8073] mt-1">
            Hiển thị <span className="font-semibold text-[#191919]">{filteredProblems.length}</span>
            {' '}/ {totalCount} bài tập
          </p>
        </div>
        {isInstructor && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#193a2b] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#122b1f] transition-colors"
          >
            <Plus size={16} /> Tạo bài tập mới
          </button>
        )}
      </div>

      {/* Search + Filters + Sort */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, mã hoặc mô tả..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] outline-none placeholder:text-[#bfae99] focus:ring-2 focus:ring-[#193a2b] focus:border-[#193a2b]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">Độ khó:</span>
            <div className="flex gap-1.5">
              {(['all', 'EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    difficulty === level
                      ? level === 'all' ? 'bg-[#193a2b] text-white shadow-sm'
                        : level === 'EASY' ? 'bg-emerald-600 text-white shadow-sm'
                        : level === 'MEDIUM' ? 'bg-yellow-500 text-white shadow-sm'
                        : 'bg-red-600 text-white shadow-sm'
                      : 'bg-[#f0ebd9] text-[#5c5446] hover:bg-[#e5dac9]'
                  }`}
                >
                  {level === 'all' ? 'Tất cả' : difficultyLabels[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-[#e5dac9] hidden sm:block" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={13} className="text-[#8a8073]" />
            <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">Sắp xếp:</span>
            <div className="flex gap-1.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortKey(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    sortKey === opt.value
                      ? 'bg-[#193a2b] text-white shadow-sm'
                      : 'bg-[#f0ebd9] text-[#5c5446] hover:bg-[#e5dac9]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Problem list */}
      <div className="space-y-2.5">
        {filteredProblems.map((problem) => (
          <Link
            key={problem.id}
            to={isInstructor ? `/instructor/problem/${problem.id}` : `/student/problem/${problem.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-[#e5dac9] bg-white px-5 py-4 shadow-sm transition-all hover:border-[#193a2b]/40 hover:shadow-md sm:flex-row sm:items-center"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold text-[#191919] group-hover:text-[#193a2b]">{problem.title}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${difficultyStyles[problem.difficulty]}`}>
                  {difficultyLabels[problem.difficulty]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-[#8a8073]">{problem.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#8a8073] flex-shrink-0">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-semibold text-[#5c5446]">{problem.time_limit} ms</span>
                <span className="text-[10px] text-[#bfae99]">Thời gian</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-semibold text-[#5c5446]">{problem.memory_limit} MB</span>
                <span className="text-[10px] text-[#bfae99]">Bộ nhớ</span>
              </div>
              <span className="hidden sm:inline text-[11px] font-bold tracking-wider text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-md px-2 py-1">
                {problem.id.slice(0, 8)}…
              </span>
              {isInstructor && (
                <div className="flex items-center gap-2 border-l border-[#e5dac9] pl-4">
                  <button
                    onClick={(e) => handleOpenEditModal(e, problem)}
                    className="p-1 text-[#8a8073] hover:text-[#193a2b] transition-colors"
                    title="Sửa bài tập"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProblem(e, problem.id)}
                    className="p-1 text-[#8a8073] hover:text-red-500 transition-colors disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    title="Xóa bài tập"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <ChevronRight size={18} className="text-[#d8cfbe] group-hover:text-[#193a2b] transition-colors" />
            </div>
          </Link>
        ))}

        {filteredProblems.length === 0 && (
          <div className="rounded-2xl border border-[#e5dac9] bg-white p-12 text-center shadow-sm">
            <BookOpen size={44} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">Không tìm thấy bài nào</p>
            <p className="text-sm text-[#8a8073] mt-1">
              {query ? `Không có kết quả cho "${query}"` : 'Thử thay đổi bộ lọc.'}
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
