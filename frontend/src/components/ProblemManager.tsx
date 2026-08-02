import { useState } from 'react';
import { HomeworkProblem } from '../context/HomeworkContext';
import {
  Plus,
  Trash2,
  Edit3,
  FileText,
  Check,
  ListChecks,
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

export default function ProblemManager({ problems, onChange }: Props) {
  const [editingProblem, setEditingProblem] = useState<HomeworkProblem | null>(null);
  const [err, setErr] = useState('');

  const openAdd = () => {
    const draft = emptyDraft();
    setEditingProblem(draft);
    setErr('');
  };

  const openEdit = (p: HomeworkProblem) => {
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
    setErr('');
  };

  const remove = (id: string) => onChange(problems.filter((p) => p.id !== id));
  const cancelEdit = () => {
    setEditingProblem(null);
    setErr('');
  };

  const totalPoints = problems.reduce((s, p) => s + (p.points || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-[#5c5446] flex items-center gap-1.5">
          <ListChecks size={15} /> Bài toán trong bài tập
          <span className="text-xs text-[#8a8073] font-normal">({problems.length} bài • {totalPoints} điểm)</span>
        </label>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[#193a2b] text-white rounded-lg hover:bg-[#143022] transition-colors"
        >
          <Plus size={13} /> Thêm bài
        </button>
      </div>

      {/* list */}
      <div className="border border-[#e5dac9] rounded-xl overflow-hidden divide-y divide-[#e5dac9]/60 bg-white">
        {problems.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={30} className="text-[#bfae99] mx-auto mb-2" />
            <p className="text-xs text-[#8a8073]">Chưa có bài toán nào. Thêm thủ công hoặc upload file đề.</p>
          </div>
        ) : (
          problems.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--ws-hover)] transition-colors">
              <span className="text-xs text-[#8a8073] font-mono w-5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#191919] truncate">{p.title || '(chưa đặt tên)'}</p>
                <p className="text-[11px] text-[#8a8073] truncate">{p.statement.slice(0, 60) || 'Chưa có đề'}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${diffChip[p.difficulty]}`}>
                {diffLabel[p.difficulty]}
              </span>
              <span className="text-[11px] text-[#8a8073] w-10 text-right flex-shrink-0">{p.points}đ</span>
              <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-[#8a8073] hover:text-[#193a2b] rounded-md transition-colors flex-shrink-0" title="Sửa đề">
                <Edit3 size={14} />
              </button>
              <button type="button" onClick={() => remove(p.id)} className="p-1.5 text-[#8a8073] hover:text-red-600 rounded-md transition-colors flex-shrink-0" title="Xoá bài">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-[#8a8073] mt-1.5">
        💡 Chỉ hỗ trợ thêm hoặc chỉnh sửa bài thủ công trực tiếp trong danh sách này.
      </p>

      {editingProblem && (
        <div className="rounded-xl border border-[#e5dac9] bg-[#f7f4eb] p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-[#191919]">{problems.some((p) => p.id === editingProblem.id) ? 'Chỉnh sửa bài' : 'Thêm bài mới'}</h4>
            <button type="button" onClick={cancelEdit} className="text-xs text-[#8a8073] hover:text-[#191919]">Đóng</button>
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
