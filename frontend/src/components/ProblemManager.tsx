import { useState } from 'react';
import { HomeworkProblem } from '../context/HomeworkContext';
import { useProblemsQuery } from '../api/problems';
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
} from 'lucide-react';

interface Props {
  problems: HomeworkProblem[];
  onChange: (problems: HomeworkProblem[]) => void;
}

const emptyDraft = (): HomeworkProblem => ({
  id: `P${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  title: '',
  statement: '',
  difficulty: 'Easy',
  points: 100,
  sampleInput: '',
  sampleOutput: '',
});

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

type AddMode = 'manual' | 'link' | null;

export default function ProblemManager({ problems, onChange }: Props) {
  const [editingProblem, setEditingProblem] = useState<HomeworkProblem | null>(null);
  const [err, setErr] = useState('');
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [linkSearch, setLinkSearch] = useState('');

  // Fetch Problem Bank để cho phép link bài
  const { data: bankProblems = [] } = useProblemsQuery();

  const openAdd = () => {
    setAddMode('manual');
    setEditingProblem(emptyDraft());
    setErr('');
    setLinkSearch('');
  };

  const openLink = () => {
    setAddMode('link');
    setEditingProblem(null);
    setErr('');
    setLinkSearch('');
  };

  const openEdit = (p: HomeworkProblem) => {
    setAddMode('manual');
    setEditingProblem({ ...p });
    setErr('');
  };

  const saveDraft = () => {
    if (!editingProblem) return;
    if (editingProblem.title.trim().length < 2) return setErr('Tên bài cần ít nhất 2 ký tự.');
    if (editingProblem.statement.trim().length < 5) return setErr('Đề bài quá ngắn.');

    const cleaned = { ...editingProblem, title: editingProblem.title.trim() };
    const exists = problems.some((p) => p.id === cleaned.id);
    onChange(exists ? problems.map((p) => (p.id === cleaned.id ? cleaned : p)) : [...problems, cleaned]);
    setEditingProblem(null);
    setAddMode(null);
    setErr('');
  };

  /** Link bài từ Problem Bank: thêm vào danh sách với problem_id trỏ đến DB */
  const linkFromBank = (bankId: string) => {
    const bank = bankProblems.find((p) => p.id === bankId);
    if (!bank) return;
    if (problems.some((p) => p.problem_id === bankId)) {
      setErr('Bài này đã có trong danh sách.');
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
    setErr('');
  };

  const remove = (id: string) => onChange(problems.filter((p) => p.id !== id));

  const cancelEdit = () => {
    setEditingProblem(null);
    setAddMode(null);
    setErr('');
  };

  const totalPoints = problems.reduce((s, p) => s + (p.points || 0), 0);

  // Lọc danh sách Problem Bank theo search
  const bankFiltered = bankProblems.filter((bp) =>
    !linkSearch.trim() ||
    bp.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
    bp.id.toLowerCase().includes(linkSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-[#5c5446] flex items-center gap-1.5">
          <ListChecks size={15} /> Bài toán trong bài tập
          <span className="text-xs text-[#8a8073] font-normal">({problems.length} bài • {totalPoints} điểm)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openLink}
            title="Liên kết bài từ Ngân hàng đề"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Link2 size={12} /> Từ ngân hàng
          </button>
          <button
            type="button"
            onClick={openAdd}
            title="Soạn bài toán mới trực tiếp"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[#193a2b] text-white rounded-lg hover:bg-[#143022] transition-colors"
          >
            <Plus size={13} /> Soạn mới
          </button>
        </div>
      </div>

      {/* list */}
      <div className="border border-[#e5dac9] rounded-xl overflow-hidden divide-y divide-[#e5dac9]/60 bg-white">
        {problems.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={30} className="text-[#bfae99] mx-auto mb-2" />
            <p className="text-xs text-[#8a8073]">Chưa có bài toán nào. Soạn mới hoặc liên kết từ Ngân hàng đề.</p>
          </div>
        ) : (
          problems.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--ws-hover)] transition-colors">
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
              {!p.problem_id && (
                <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-[#8a8073] hover:text-[#193a2b] rounded-md transition-colors flex-shrink-0" title="Sửa đề">
                  <Edit3 size={14} />
                </button>
              )}
              <button type="button" onClick={() => remove(p.id)} className="p-1.5 text-[#8a8073] hover:text-red-600 rounded-md transition-colors flex-shrink-0" title="Xoá bài">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-[#8a8073] mt-1.5">
        💡 <strong>Soạn mới</strong>: tạo đề bài thủ công. <strong>Từ ngân hàng</strong>: liên kết bài có sẵn để SV có thể nộp code.
      </p>

      {/* ===== Panel liên kết từ Ngân hàng ===== */}
      {addMode === 'link' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
              <Link2 size={14} /> Liên kết bài từ Ngân hàng đề
            </h4>
            <button type="button" onClick={cancelEdit} className="text-xs text-blue-600 hover:text-blue-900">
              <X size={15} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              value={linkSearch}
              onChange={(e) => { setLinkSearch(e.target.value); setErr(''); }}
              placeholder="Tìm theo tên bài hoặc mã..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-[#191919] placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {bankFiltered.length === 0 ? (
              <p className="text-xs text-blue-500 text-center py-4">Không tìm thấy bài nào.</p>
            ) : (
              bankFiltered.map((bp) => {
                const alreadyAdded = problems.some((p) => p.problem_id === bp.id);
                return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => !alreadyAdded && linkFromBank(bp.id)}
                    disabled={alreadyAdded}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                      alreadyAdded
                        ? 'border-blue-200 bg-blue-100/50 opacity-60 cursor-not-allowed'
                        : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#191919] truncate">{bp.title}</p>
                      <p className="text-[11px] text-[#8a8073] font-mono">{bp.id}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                      bp.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      bp.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {bp.difficulty === 'EASY' ? 'Dễ' : bp.difficulty === 'MEDIUM' ? 'TB' : 'Khó'}
                    </span>
                    {alreadyAdded ? (
                      <span className="text-[10px] text-blue-500 font-semibold flex-shrink-0">Đã thêm</span>
                    ) : (
                      <Plus size={14} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===== Panel soạn bài mới ===== */}
      {addMode === 'manual' && editingProblem && (
        <div className="rounded-xl border border-[#e5dac9] bg-[#f7f4eb] p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-[#191919]">
              {problems.some((p) => p.id === editingProblem.id) ? 'Chỉnh sửa bài' : 'Soạn bài mới'}
            </h4>
            <button type="button" onClick={cancelEdit} className="text-xs text-[#8a8073] hover:text-[#191919]">
              <X size={15} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Tên bài *</label>
            <input
              value={editingProblem.title}
              onChange={(e) => setEditingProblem({ ...editingProblem, title: e.target.value })}
              placeholder="VD: Tổng hai số"
              className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Độ khó</label>
              <select
                value={editingProblem.difficulty}
                onChange={(e) => setEditingProblem({ ...editingProblem, difficulty: e.target.value as HomeworkProblem['difficulty'] })}
                className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              >
                <option value="Easy">Dễ</option>
                <option value="Medium">Trung bình</option>
                <option value="Hard">Khó</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Điểm</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={editingProblem.points}
                onChange={(e) => setEditingProblem({ ...editingProblem, points: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Đề bài *</label>
            <textarea
              value={editingProblem.statement}
              onChange={(e) => setEditingProblem({ ...editingProblem, statement: e.target.value })}
              rows={5}
              placeholder="Mô tả yêu cầu, ràng buộc, định dạng vào/ra…"
              className="w-full px-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px] leading-6"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Input mẫu</label>
              <textarea
                value={editingProblem.sampleInput}
                onChange={(e) => setEditingProblem({ ...editingProblem, sampleInput: e.target.value })}
                rows={3}
                placeholder="3 5"
                className="w-full px-3 py-2 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c5446] mb-1.5">Output mẫu</label>
              <textarea
                value={editingProblem.sampleOutput}
                onChange={(e) => setEditingProblem({ ...editingProblem, sampleOutput: e.target.value })}
                rows={3}
                placeholder="8"
                className="w-full px-3 py-2 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none font-mono text-[13px]"
              />
            </div>
          </div>
          {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={saveDraft} className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md flex items-center justify-center gap-2">
              <Check size={15} /> {problems.some((p) => p.id === editingProblem.id) ? 'Lưu đề' : 'Thêm bài'}
            </button>
            <button type="button" onClick={cancelEdit} className="px-6 py-2.5 bg-white border border-[#e5dac9] text-[#5c5446] font-medium rounded-xl hover:bg-[var(--ws-hover)]">Huỷ</button>
          </div>
        </div>
      )}
    </div>
  );
}
