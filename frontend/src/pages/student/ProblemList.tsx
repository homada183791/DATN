import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { problems, submissions } from '../../data/mockData';
import { getDetail } from '../../data/problemDetails';
import { useContributed, ContributedProblem } from '../../context/ContributedContext';
import { HomeworkProblem } from '../../context/HomeworkContext';
import ProblemManager from '../../components/ProblemManager';
import { Search, CheckCircle2, Circle, ChevronRight, BookOpen, Flame, Plus, X, Users2, Trash2 } from 'lucide-react';

export default function ProblemList() {
  const { user } = useAuth();
  const { contributed, addContributed, removeContributed } = useContributed();
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [status, setStatus] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilters, setShowTagFilters] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [draft, setDraft] = useState<HomeworkProblem[]>([]);
  const [category, setCategory] = useState('Khác');
  const [expandedContrib, setExpandedContrib] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const submitContribution = () => {
    if (draft.length === 0) return;
    const items: ContributedProblem[] = draft.map((p) => ({
      ...p,
      author: user?.fullName ?? 'Ẩn danh',
      authorRole: user?.role ?? 'student',
      category,
      createdAt: new Date().toISOString().slice(0, 10),
    }));
    addContributed(items);
    setDraft([]);
    setShowContribute(false);
    setToast(`Đã đóng góp ${items.length} bài tập cho cộng đồng. Cảm ơn bạn!`);
    setTimeout(() => setToast(''), 4000);
  };

  const solvedIds = useMemo(
    () => new Set(submissions.filter((s) => s.userId === user?.id && s.verdict === 'AC').map((s) => s.problemId)),
    [user?.id]
  );

  const tagOptions = useMemo(() => Array.from(new Set(problems.flatMap((p) => p.tags))).sort(), []);

  const filteredList = problems.filter((p) => {
    const q = query.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchD = diff === 'all' || p.difficulty === diff;
    const matchS = status === 'all' || (status === 'solved' ? solvedIds.has(p.id) : !solvedIds.has(p.id));
    const matchTag = selectedTags.length === 0 || selectedTags.every((tag) => p.tags.includes(tag));
    return matchQ && matchD && matchS && matchTag;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const [page, setPage] = useState(1);
  const safePage = Math.min(page, totalPages);
  const pagedList = filteredList.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, diff, status, selectedTags]);

  const diffStyle: Record<string, string> = {
    Easy: 'text-emerald-800 bg-emerald-100 border-emerald-200',
    Medium: 'text-yellow-800 bg-yellow-100 border-yellow-200',
    Hard: 'text-red-800 bg-red-100 border-red-200',
  };
  const diffLabel: Record<string, string> = { Easy: 'Dễ', Medium: 'Trung bình', Hard: 'Khó' };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">Bài tập</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {problems.length} bài toán • {solvedIds.size} đã hoàn thành — chọn một bài để mở không gian làm việc.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#cc5a37]/10 border border-[#cc5a37]/25 rounded-xl">
            <Flame size={16} className="text-[#cc5a37]" />
            <span className="text-sm font-semibold text-[#cc5a37]">Chuỗi 4 ngày</span>
          </div>
          <button
            onClick={() => { setDraft([]); setCategory('Khác'); setShowContribute(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-md"
          >
            <Plus size={16} /> Đóng góp bài tập
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-sm font-medium animate-slide-up">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e5dac9] bg-[#f7f4eb]/70 p-4 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, mã bài hoặc chủ đề…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8a8073]">Trạng thái</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'solved' | 'unsolved')}
              className="rounded-xl border border-[#e5dac9] bg-white px-3 py-2.5 text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="all">Tất cả</option>
              <option value="solved">Đã giải</option>
              <option value="unsolved">Chưa giải</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8a8073]">Độ khó</span>
            <select
              value={diff}
              onChange={(e) => setDiff(e.target.value as 'all' | 'Easy' | 'Medium' | 'Hard')}
              className="rounded-xl border border-[#e5dac9] bg-white px-3 py-2.5 text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            >
              <option value="all">Tất cả</option>
              <option value="Easy">Dễ</option>
              <option value="Medium">Trung bình</option>
              <option value="Hard">Khó</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8a8073]">Tags</span>
          <button
            type="button"
            onClick={() => setShowTagFilters((prev) => !prev)}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
              selectedTags.length > 0 ? 'border-[#193a2b] bg-[#193a2b]/10 text-[#193a2b]' : 'border-[#e5dac9] bg-white text-[#5c5446]'
            }`}
          >
            <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.2em]">
              <span>THẺ</span>
              <span className="text-[11px] font-medium text-[#8a8073]">{selectedTags.length > 0 ? `(${selectedTags.length})` : ''}</span>
            </span>
            <ChevronRight size={16} className={`transition-transform ${showTagFilters ? 'rotate-90' : ''}`} />
          </button>
          {showTagFilters && (
            <div className="rounded-xl border border-[#e5dac9] bg-white p-2.5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedTags.length === 0 ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-[#f7f4eb] text-[#5c5446] hover:text-[#191919]'
                  }`}
                >
                  Tất cả
                </button>
                {tagOptions.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                        active ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-[#f7f4eb] text-[#5c5446] hover:text-[#191919]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* list */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
        {pagedList.map((p) => {
          const solved = solvedIds.has(p.id);
          const detail = getDetail(p.id, p.title, p.points);
          return (
            <Link
              key={p.id}
              to={`/student/problem/${p.id}`}
              className="group flex items-center gap-4 px-5 py-4 hover:bg-[#f7f4eb]/70 transition-colors"
            >
              <span className={solved ? 'text-emerald-600' : 'text-[#d8cfbe]'}>
                {solved ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </span>
              <span className="hidden sm:block text-[11px] font-bold tracking-wider text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-md px-2 py-1 w-24 text-center flex-shrink-0">
                {detail.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#191919] group-hover:text-[#193a2b] transition-colors truncate">
                  {p.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${diffStyle[p.difficulty]}`}>
                    {diffLabel[p.difficulty]}
                  </span>
                  {p.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[11px] text-[#8a8073] bg-[#f7f4eb] border border-[#e5dac9] rounded-full px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden md:block text-right flex-shrink-0">
                <p className="text-sm font-semibold text-[#191919]">{p.points} <span className="text-[11px] text-[#8a8073] font-normal">điểm</span></p>
                <p className="text-[11px] text-[#8a8073] mt-0.5">{p.solvedCount} người giải</p>
              </div>
              <ChevronRight size={18} className="text-[#d8cfbe] group-hover:text-[#193a2b] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          );
        })}
        {filteredList.length === 0 && (
          <div className="p-14 text-center">
            <BookOpen size={44} className="text-[#bfae99] mx-auto mb-3" />
            <p className="text-[#8a8073]">Không có bài nào khớp bộ lọc.</p>
          </div>
        )}
      </div>

      {filteredList.length > pageSize && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="rounded-xl border border-[#e5dac9] bg-white px-3 py-2 text-sm font-medium text-[#5c5446] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${safePage === pageNumber ? 'bg-[#193a2b] text-white shadow-sm' : 'border border-[#e5dac9] bg-white text-[#5c5446]'}`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage === totalPages}
            className="rounded-xl border border-[#e5dac9] bg-white px-3 py-2 text-sm font-medium text-[#5c5446] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}

      {/* ===== community contributed ===== */}
      {contributed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users2 size={18} className="text-[#193a2b]" />
            <h3 className="text-lg font-bold font-serif text-[#191919]">Bài tập cộng đồng đóng góp</h3>
            <span className="text-xs text-[#8a8073]">({contributed.length})</span>
          </div>
          <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#e5dac9]/60">
            {contributed.map((p) => {
              const open = expandedContrib === p.id;
              return (
                <div key={p.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--ws-hover)] transition-colors">
                    <button onClick={() => setExpandedContrib(open ? null : p.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${diffStyle[p.difficulty]}`}>{diffLabel[p.difficulty]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[#191919] truncate">{p.title}</p>
                        <p className="text-[11px] text-[#8a8073] mt-0.5">
                          {p.category} • {p.points}đ • đóng góp bởi <span className="font-medium">{p.author}</span>
                          {p.authorRole === 'instructor' && <span className="ml-1 text-[#193a2b]">(GV)</span>} • {p.createdAt}
                        </p>
                      </div>
                      <ChevronRight size={16} className={`text-[#8a8073] transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
                    </button>
                    {(p.author === user?.fullName) && (
                      <button onClick={() => removeContributed(p.id)} className="p-1.5 text-[#8a8073] hover:text-red-600 rounded-md transition-colors flex-shrink-0" title="Gỡ đóng góp">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="px-5 pb-4 pt-1 bg-[#f7f4eb]/40 animate-fade-in">
                      <p className="text-[13px] text-[#5c5446] leading-6 whitespace-pre-wrap font-mono">{p.statement}</p>
                      {(p.sampleInput || p.sampleOutput) && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg border border-[#e5dac9] overflow-hidden">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8a8073] bg-[#f0ebd9]">Input mẫu</p>
                            <pre className="px-3 py-2 text-[12.5px] font-mono whitespace-pre-wrap text-[#191919]">{p.sampleInput || '—'}</pre>
                          </div>
                          <div className="rounded-lg border border-[#e5dac9] overflow-hidden">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8a8073] bg-[#f0ebd9]">Output mẫu</p>
                            <pre className="px-3 py-2 text-[12.5px] font-mono whitespace-pre-wrap text-[#191919]">{p.sampleOutput || '—'}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== contribute modal ===== */}
      {showContribute && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowContribute(false)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] sticky top-0 bg-[#f7f4eb] z-10">
              <div>
                <h3 className="font-bold font-serif text-[16px] text-[#191919]">Đóng góp bài tập</h3>
                <p className="text-xs text-[#8a8073] mt-0.5">Chia sẻ đề bài của bạn cho cộng đồng JudgeHub.</p>
              </div>
              <button onClick={() => setShowContribute(false)} className="text-[#8a8073] hover:text-[#191919]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Chủ đề</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                  {['Math', 'DP', 'Graph', 'Sorting', 'String', 'Data Structure', 'Binary Search', 'Khác'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <ProblemManager problems={draft} onChange={setDraft} />
              <p className="text-[11.5px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                🌍 Bài đóng góp sẽ hiển thị công khai trong mục "Bài tập cộng đồng" cho mọi người tham khảo.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={submitContribution} disabled={draft.length === 0} className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                  Đóng góp {draft.length > 0 ? `(${draft.length} bài)` : ''}
                </button>
                <button onClick={() => setShowContribute(false)} className="px-6 py-2.5 bg-white border border-[#e5dac9] text-[#5c5446] font-medium rounded-xl hover:bg-[var(--ws-hover)]">Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
