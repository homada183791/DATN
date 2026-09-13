import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HomeworkProblem } from '../context/HomeworkContext';
import { useProblemsQuery, createProblem, type CreateProblemDto } from '../api/problems';
import {
  Plus,
  Trash2,
  Edit3,
  FileText,
  Check,
  ListChecks,
  Link2,
  Search,
  X,
  Loader2,
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

// Map ngược để tạo Problem từ soạn mới
const diffMapReverse: Record<HomeworkProblem['difficulty'], 'EASY' | 'MEDIUM' | 'HARD'> = {
  Easy: 'EASY',
  Medium: 'MEDIUM',
  Hard: 'HARD',
};

type ModalType = 'link' | 'compose' | null;

interface ComposeDraft {
  title: string;
  difficulty: HomeworkProblem['difficulty'];
  points: number;
  statement: string;
  sampleInput: string;
  sampleOutput: string;
}

const emptyCompose = (): ComposeDraft => ({
  title: '',
  difficulty: 'Easy',
  points: 100,
  statement: '',
  sampleInput: '',
  sampleOutput: '',
});

export default function ProblemManager({ problems, onChange }: Props) {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkErr, setLinkErr] = useState('');

  const [compose, setCompose] = useState<ComposeDraft>(emptyCompose());
  const [composeErr, setComposeErr] = useState('');
  const [composeSaving, setComposeSaving] = useState(false);

  // Fetch Problem Bank để cho phép link bài
  const { data: bankProblems = [] } = useProblemsQuery();

  const totalPoints = problems.reduce((s, p) => s + (p.points || 0), 0);

  // ── Link từ ngân hàng ────────────────────────────────────────────────────
  const linkFromBank = (bankId: string) => {
    const bank = bankProblems.find((p) => p.id === bankId);
    if (!bank) return;
    if (problems.some((p) => p.problem_id === bankId)) {
      setLinkErr('Bài này đã có trong danh sách.');
      return;
    }
    const task: HomeworkProblem = {
      id: `LINKED-${bankId}`,
      problem_id: bankId,
      title: bank.title,
      statement: bank.description,
      difficulty: diffMap[bank.difficulty] ?? 'Easy',
      points: 100,
      sampleInput: bank.test_cases?.find((tc) => !tc.is_hidden)?.input ?? '',
      sampleOutput: bank.test_cases?.find((tc) => !tc.is_hidden)?.expected_output ?? '',
    };
    onChange([...problems, task]);
    setLinkErr('');
    setModalType(null);
  };

  // ── Soạn bài mới → tạo Problem trong ngân hàng rồi link ─────────────────
  const saveCompose = async () => {
    if (compose.title.trim().length < 2) return setComposeErr('Tên bài cần ít nhất 2 ký tự.');
    if (compose.statement.trim().length < 5) return setComposeErr('Đề bài quá ngắn.');

    setComposeSaving(true);
    setComposeErr('');
    try {
      const dto: CreateProblemDto = {
        title: compose.title.trim(),
        description: compose.statement.trim(),
        difficulty: diffMapReverse[compose.difficulty],
        time_limit: 1000,
        memory_limit: 256,
        test_cases: compose.sampleInput.trim()
          ? [{ input: compose.sampleInput.trim(), expected_output: compose.sampleOutput.trim(), is_hidden: false }]
          : [],
      };
      const created = await createProblem(dto);
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      const task: HomeworkProblem = {
        id: `LINKED-${created.id}`,
        problem_id: created.id,
        title: created.title,
        statement: created.description,
        difficulty: diffMap[created.difficulty] ?? 'Easy',
        points: compose.points,
        sampleInput: compose.sampleInput,
        sampleOutput: compose.sampleOutput,
      };
      onChange([...problems, task]);
      setCompose(emptyCompose());
      setModalType(null);
    } catch (e: any) {
      setComposeErr(e?.message ?? 'Có lỗi khi tạo bài. Thử lại.');
    } finally {
      setComposeSaving(false);
    }
  };

  const remove = (id: string) => onChange(problems.filter((p) => p.id !== id));

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
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Link2 size={12} /> Từ ngân hàng
          </button>
          <button
            type="button"
            onClick={() => { setCompose(emptyCompose()); setComposeErr(''); setModalType('compose'); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[#193a2b] text-white rounded-lg hover:bg-[#143022] transition-colors"
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
                <p className="text-[11px] text-[#8a8073] truncate">{p.statement.slice(0, 60) || 'Chưa có đề'}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${diffChip[p.difficulty]}`}>
                {diffLabel[p.difficulty]}
              </span>
              <span className="text-[11px] text-[#8a8073] w-10 text-right flex-shrink-0">{p.points}đ</span>
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
        💡 <strong>Soạn mới</strong>: tạo bài và thêm vào ngân hàng đề. <strong>Từ ngân hàng</strong>: liên kết bài có sẵn.
      </p>

      {/* ───── Modal: Liên kết từ Ngân hàng ───── */}
      {modalType === 'link' && hasDocument && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-md shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5dac9]">
              <h4 className="text-sm font-bold text-[#191919] flex items-center gap-2">
                <Link2 size={15} className="text-blue-600" /> Liên kết bài từ Ngân hàng đề
              </h4>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-[#8a8073] hover:text-[#191919] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[#e5dac9]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
                <input
                  autoFocus
                  value={linkSearch}
                  onChange={(e) => { setLinkSearch(e.target.value); setLinkErr(''); }}
                  placeholder="Tìm theo tên bài hoặc mã..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5dac9] rounded-xl text-sm text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>
              {linkErr && <p className="text-xs text-red-600 font-medium mt-2">{linkErr}</p>}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto p-3 space-y-1.5">
              {bankFiltered.length === 0 ? (
                <p className="text-sm text-[#8a8073] text-center py-8">Không tìm thấy bài nào trong ngân hàng.</p>
              ) : (
                bankFiltered.map((bp) => {
                  const alreadyAdded = problems.some((p) => p.problem_id === bp.id);
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => !alreadyAdded && linkFromBank(bp.id)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        alreadyAdded
                          ? 'border-[#e5dac9] bg-[#f0ebd9] opacity-60 cursor-not-allowed'
                          : 'border-[#e5dac9] bg-white hover:border-[#193a2b]/40 hover:bg-[#f7f4eb]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#191919] truncate">{bp.title}</p>
                        <p className="text-[11px] text-[#8a8073] font-mono truncate">{bp.id}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                        bp.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        bp.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {bp.difficulty === 'EASY' ? 'Dễ' : bp.difficulty === 'MEDIUM' ? 'TB' : 'Khó'}
                      </span>
                      {alreadyAdded ? (
                        <Check size={15} className="text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Plus size={15} className="text-[#193a2b] flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-full py-2.5 bg-[#f0ebd9] border border-[#e5dac9] text-[#5c5446] font-medium text-sm rounded-xl hover:bg-[#e5dac9] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ───── Modal: Soạn bài mới ───── */}
      {modalType === 'compose' && hasDocument && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4"
          onClick={() => !composeSaving && setModalType(null)}
        >
          <div
            className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5dac9] sticky top-0 bg-[#f7f4eb] z-10">
              <h4 className="text-sm font-bold text-[#191919] flex items-center gap-2">
                <Edit3 size={15} className="text-[#193a2b]" /> Soạn bài toán mới
              </h4>
              <button
                type="button"
                onClick={() => !composeSaving && setModalType(null)}
                className="text-[#8a8073] hover:text-[#191919] transition-colors"
                disabled={composeSaving}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tên bài */}
              <div>
                <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Tên bài *</label>
                <input
                  autoFocus
                  value={compose.title}
                  onChange={(e) => setCompose({ ...compose, title: e.target.value })}
                  placeholder="VD: Tổng hai số"
                  className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] text-sm"
                />
              </div>

              {/* Độ khó + Điểm */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Độ khó</label>
                  <select
                    value={compose.difficulty}
                    onChange={(e) => setCompose({ ...compose, difficulty: e.target.value as HomeworkProblem['difficulty'] })}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b] text-sm"
                  >
                    <option value="Easy">Dễ</option>
                    <option value="Medium">Trung bình</option>
                    <option value="Hard">Khó</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Điểm</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={compose.points}
                    onChange={(e) => setCompose({ ...compose, points: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b] text-sm"
                  />
                </div>
              </div>

              {/* Đề bài */}
              <div>
                <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Đề bài *</label>
                <textarea
                  value={compose.statement}
                  onChange={(e) => setCompose({ ...compose, statement: e.target.value })}
                  rows={5}
                  placeholder="Mô tả yêu cầu, ràng buộc, định dạng vào/ra…"
                  className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px] leading-6"
                />
              </div>

              {/* Input/Output mẫu */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Input mẫu</label>
                  <textarea
                    value={compose.sampleInput}
                    onChange={(e) => setCompose({ ...compose, sampleInput: e.target.value })}
                    rows={3}
                    placeholder="3 5"
                    className="w-full px-3 py-2 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5446] mb-1.5">Output mẫu</label>
                  <textarea
                    value={compose.sampleOutput}
                    onChange={(e) => setCompose({ ...compose, sampleOutput: e.target.value })}
                    rows={3}
                    placeholder="8"
                    className="w-full px-3 py-2 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                💡 Bài soạn mới sẽ được thêm vào <strong>Ngân hàng đề</strong> và sinh viên có thể nộp code.
              </p>

              {composeErr && <p className="text-xs text-red-600 font-medium">{composeErr}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={saveCompose}
                  disabled={composeSaving}
                  className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {composeSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {composeSaving ? 'Đang tạo...' : 'Tạo và thêm vào bài tập'}
                </button>
                <button
                  type="button"
                  onClick={() => !composeSaving && setModalType(null)}
                  disabled={composeSaving}
                  className="px-6 py-2.5 bg-white border border-[#e5dac9] text-[#5c5446] font-medium rounded-xl hover:bg-[#f0ebd9] disabled:opacity-50"
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
