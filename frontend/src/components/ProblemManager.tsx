import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HomeworkProblem } from '../context/HomeworkContext';
import { useProblemsQuery, createProblem, fetchProblem, type CreateProblemDto } from '../api/problems';
import ProblemFormModal from './ProblemFormModal';
import {
  Plus,
  Trash2,
  FileText,
  Check,
  ListChecks,
  Link2,
  Search,
  X,
  Loader2,
  Clock,
  HardDrive,
} from 'lucide-react';

interface Props {
  problems: HomeworkProblem[];
  onChange: (problems: HomeworkProblem[]) => void;
}

const diffChip: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Hard: 'bg-red-100 text-red-800 border-red-200',
};
const diffLabel: Record<string, string> = { Easy: 'Dễ', Medium: 'Trung bình', Hard: 'Khó' };

// Map difficulty từ Problem Bank (EASY/MEDIUM/HARD) → HomeworkProblem (Easy/Medium/Hard)
const diffMap: Record<string, HomeworkProblem['difficulty']> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

type ModalType = 'link' | 'compose' | null;

export default function ProblemManager({ problems, onChange }: Props) {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkErr, setLinkErr] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [composeSaving, setComposeSaving] = useState(false);

  // Fetch Problem Bank để cho phép link bài
  const { data: bankProblems = [] } = useProblemsQuery();

  const totalPoints = problems.reduce((s, p) => s + (p.points || 0), 0);

  // ── Link từ ngân hàng ────────────────────────────────────────────────────
  const linkFromBank = async (bankId: string) => {
    const bank = bankProblems.find((p) => p.id === bankId);
    if (!bank) return;
    if (problems.some((p) => p.problem_id === bankId)) {
      setLinkErr('Bài này đã có trong danh sách.');
      return;
    }
    setLinkingId(bankId);
    setLinkErr('');
    try {
      // Gọi fetchProblem để lấy đầy đủ description và test_cases
      const full = await fetchProblem(bankId);
      const sampleTc = full.test_cases?.find((tc) => !tc.is_hidden) || full.test_cases?.[0];
      const task: HomeworkProblem = {
        id: `LINKED-${bankId}`,
        problem_id: bankId,
        title: full.title || bank.title,
        statement: full.description || bank.description || '',
        difficulty: diffMap[full.difficulty] ?? diffMap[bank.difficulty] ?? 'Easy',
        points: 100,
        sampleInput: sampleTc?.input ?? '',
        sampleOutput: sampleTc?.expected_output ?? '',
      };
      onChange([...problems, task]);
      setModalType(null);
    } catch {
      // Fallback an toàn nếu có lỗi kết nối
      const task: HomeworkProblem = {
        id: `LINKED-${bankId}`,
        problem_id: bankId,
        title: bank.title,
        statement: bank.description || '',
        difficulty: diffMap[bank.difficulty] ?? 'Easy',
        points: 100,
        sampleInput: '',
        sampleOutput: '',
      };
      onChange([...problems, task]);
      setModalType(null);
    } finally {
      setLinkingId(null);
    }
  };

  // ── Soạn bài mới → tạo Problem trong ngân hàng rồi link ─────────────────
  const handleComposeSubmit = async (data: CreateProblemDto, points = 100) => {
    setComposeSaving(true);
    try {
      const created = await createProblem(data);
      queryClient.invalidateQueries({ queryKey: ['problems'] });

      const sampleTc = data.test_cases?.find((tc) => !tc.is_hidden) || data.test_cases?.[0];
      const task: HomeworkProblem = {
        id: `LINKED-${created.id}`,
        problem_id: created.id,
        title: created.title,
        statement: created.description || '',
        difficulty: diffMap[created.difficulty] ?? 'Easy',
        points: points,
        sampleInput: sampleTc?.input ?? '',
        sampleOutput: sampleTc?.expected_output ?? '',
      };
      onChange([...problems, task]);
      setModalType(null);
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi tạo bài toán vào ngân hàng đề.');
    } finally {
      setComposeSaving(false);
    }
  };

  const remove = (id: string) => onChange(problems.filter((p) => p.id !== id));

  const updatePoints = (id: string, newPoints: number) => {
    onChange(problems.map((p) => (p.id === id ? { ...p, points: Math.max(0, newPoints) } : p)));
  };

  const bankFiltered = bankProblems.filter(
    (bp) =>
      !linkSearch.trim() ||
      bp.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
      bp.id.toLowerCase().includes(linkSearch.toLowerCase())
  );

  const hasDocument = typeof document !== 'undefined';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-[#5c5446] flex items-center gap-1.5">
          <ListChecks size={15} /> Bài toán trong bài tập
          <span className="text-xs text-[#8a8073] font-normal">({problems.length} bài • {totalPoints} điểm)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setLinkSearch(''); setLinkErr(''); setModalType('link'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
          >
            <Link2 size={13} /> Từ ngân hàng
          </button>
          <button
            type="button"
            onClick={() => setModalType('compose')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#193a2b] text-white rounded-lg hover:bg-[#143022] transition-colors shadow-sm"
          >
            <Plus size={13} /> Soạn mới
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="border border-[#e5dac9] rounded-xl overflow-hidden divide-y divide-[#e5dac9]/60 bg-white">
        {problems.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={30} className="text-[#bfae99] mx-auto mb-2" />
            <p className="text-xs text-[#8a8073]">Chưa có bài toán nào. Soạn mới hoặc liên kết từ Ngân hàng đề.</p>
          </div>
        ) : (
          problems.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#f7f4eb] transition-colors">
              <span className="text-xs text-[#8a8073] font-mono w-5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#191919] truncate">{p.title || '(chưa đặt tên)'}</p>
                  {p.problem_id && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-bold flex-shrink-0">
                      LINKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8a8073] truncate">{p.statement?.slice(0, 60) || 'Chưa có mô tả'}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${diffChip[p.difficulty]}`}>
                {diffLabel[p.difficulty]}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={p.points ?? 100}
                  onChange={(e) => updatePoints(p.id, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs font-semibold text-right bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-[#191919] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#193a2b]"
                  title="Chỉnh sửa điểm số cho bài này"
                />
                <span className="text-[11px] text-[#8a8073]">đ</span>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="p-1.5 text-[#8a8073] hover:text-red-600 rounded-md transition-colors flex-shrink-0"
                title="Xoá bài"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-[#8a8073] mt-1.5">
        💡 <strong>Soạn mới</strong>: tạo bài toán đầy đủ (đề bài, test cases) vào ngân hàng đề và tự động gán vào bài tập. <strong>Từ ngân hàng</strong>: liên kết bài có sẵn.
      </p>

      {/* ───── Modal: Liên kết từ Ngân hàng ───── */}
      {modalType === 'link' && hasDocument && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4"
          onClick={() => !linkingId && setModalType(null)}
        >
          <div
            className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-xl shadow-2xl animate-slide-up flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] bg-[#f7f4eb] flex-shrink-0">
              <div>
                <h4 className="text-base font-bold text-[#191919] flex items-center gap-2">
                  <Link2 size={17} className="text-blue-600" /> Liên kết bài từ Ngân hàng đề
                </h4>
                <p className="text-xs text-[#8a8073] mt-0.5">
                  Chọn các bài toán đã biên soạn sẵn trong thư viện để đưa vào bài tập
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                disabled={!!linkingId}
                className="p-2 rounded-xl text-[#8a8073] hover:bg-[#e5dac9] hover:text-[#191919] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[#e5dac9] bg-white flex-shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
                <input
                  autoFocus
                  value={linkSearch}
                  onChange={(e) => { setLinkSearch(e.target.value); setLinkErr(''); }}
                  placeholder="Tìm theo tiêu đề bài hoặc mã ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] placeholder-[#bfae99] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>
              {linkErr && <p className="text-xs text-red-600 font-medium mt-2">{linkErr}</p>}
            </div>

            {/* List */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {bankFiltered.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={36} className="text-[#bfae99] mx-auto mb-2" />
                  <p className="text-sm text-[#8a8073]">Không tìm thấy bài nào trong ngân hàng đề.</p>
                </div>
              ) : (
                bankFiltered.map((bp) => {
                  const alreadyAdded = problems.some((p) => p.problem_id === bp.id);
                  const isLinking = linkingId === bp.id;
                  return (
                    <div
                      key={bp.id}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        alreadyAdded
                          ? 'border-[#e5dac9] bg-[#f0ebd9]/60 opacity-60'
                          : 'border-[#e5dac9] bg-white hover:border-[#193a2b]/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-[#191919] truncate">{bp.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                            bp.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            bp.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {bp.difficulty === 'EASY' ? 'Dễ' : bp.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó'}
                          </span>
                        </div>
                        <p className="text-xs text-[#8a8073] line-clamp-1 mb-1.5">
                          {bp.description || 'Chưa có mô tả chi tiết'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#8a8073]">
                          <span className="font-mono text-[#5c5446]">{bp.id}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{bp.time_limit}ms</span>
                          <span className="flex items-center gap-1"><HardDrive size={11} />{bp.memory_limit}MB</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => !alreadyAdded && !isLinking && linkFromBank(bp.id)}
                        disabled={alreadyAdded || isLinking}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                          alreadyAdded
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-200'
                            : 'bg-[#193a2b] text-white hover:bg-[#143022] shadow-sm disabled:opacity-50'
                        }`}
                      >
                        {isLinking ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Đang thêm...
                          </>
                        ) : alreadyAdded ? (
                          <>
                            <Check size={13} /> Đã thêm
                          </>
                        ) : (
                          <>
                            <Plus size={13} /> Thêm bài
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[#e5dac9] bg-[#eee8d8] flex justify-between items-center flex-shrink-0">
              <span className="text-xs text-[#8a8073]">
                Hiển thị {bankFiltered.length} bài toán trong thư viện
              </span>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-5 py-2 bg-white border border-[#e5dac9] text-[#5c5446] font-medium text-xs rounded-xl hover:bg-[#f0ebd9] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ───── Modal: Soạn bài mới (Full ProblemFormModal) ───── */}
      <ProblemFormModal
        isOpen={modalType === 'compose'}
        onClose={() => !composeSaving && setModalType(null)}
        onSubmit={handleComposeSubmit}
        isLoading={composeSaving}
        showPoints
        initialPoints={100}
        titleText="Soạn bài toán mới cho bài tập"
        subtitleText="Bài toán sẽ được lưu vào Ngân hàng bài tập và tự động thêm vào bài tập này"
        submitText="Tạo & Thêm vào bài tập"
      />
    </div>
  );
}
