import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Loader2, Search } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useProblemsQuery, type ProblemDto } from '../../api/problems';

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

export default function ProblemList() {
  const { data, isLoading, error } = useProblemsQuery();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | ProblemDto['difficulty']>('all');

  const filteredProblems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (data ?? []).filter((problem) => {
      const matchesSearch =
        !search ||
        problem.title.toLowerCase().includes(search) ||
        problem.id.toLowerCase().includes(search) ||
        problem.description.toLowerCase().includes(search);
      const matchesDifficulty = difficulty === 'all' || problem.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [data, difficulty, query]);

  if (isLoading) {
    return (
      <div className="space-y-6 text-[#191919]">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">Bài tập</h2>
          <p className="text-sm text-[#8a8073] mt-1">Đang tải danh sách bài tập...</p>
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

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">Bài tập</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {filteredProblems.length} / {(data ?? []).length} bài tập
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#e5dac9] bg-white px-3 py-2 shadow-sm">
          <Search size={16} className="text-[#8a8073]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, mã hoặc mô tả..."
            className="w-64 bg-transparent text-sm outline-none placeholder:text-[#bfae99]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setDifficulty(level)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              difficulty === level ? 'bg-[#193a2b] text-white' : 'bg-white text-[#5c5446] border border-[#e5dac9]'
            }`}
          >
            {level === 'all' ? 'Tất cả' : difficultyLabels[level]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredProblems.map((problem) => (
          <Link
            key={problem.id}
            to={`/student/problem/${problem.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-[#e5dac9] bg-white px-5 py-4 shadow-sm transition-all hover:border-[#193a2b]/30 hover:shadow-md sm:flex-row sm:items-center"
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
            <div className="flex items-center gap-4 text-sm text-[#8a8073]">
              <span>{problem.time_limit} ms</span>
              <span>{problem.memory_limit} MB</span>
              <span className="hidden sm:inline text-[11px] font-bold tracking-wider text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-md px-2 py-1">
                {problem.id}
              </span>
              <ChevronRight size={18} className="text-[#d8cfbe] group-hover:text-[#193a2b]" />
            </div>
          </Link>
        ))}

        {filteredProblems.length === 0 && (
          <div className="rounded-2xl border border-[#e5dac9] bg-white p-12 text-center shadow-sm">
            <BookOpen size={44} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">Không có bài nào khớp bộ lọc.</p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center text-sm text-[#8a8073]">
          <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải...
        </div>
      )}
    </div>
  );
}
