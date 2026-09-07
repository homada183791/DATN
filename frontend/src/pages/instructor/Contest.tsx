import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createContest, deleteContest, updateContest, useContestsQuery, useLeaderboardQuery } from '../../api/contests';
import { useClassesQuery } from '../../api/classes';
import { ApiError } from '../../api/http';
import { notifyGlobalToast } from '../../context/ToastContext';
import {
  Trophy,
  Users,
  Plus,
  Search,
  X,
  Calendar,
  Edit3,
  Trash2,
  Eye,
} from 'lucide-react';

type ContestForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  visibility: 'public' | 'private';
  classId: string;
};

const emptyContestForm: ContestForm = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  visibility: 'public',
  classId: '',
};

export default function InstructorContest() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [form, setForm] = useState<ContestForm>(emptyContestForm);
  const [editingContest, setEditingContest] = useState<string | null>(null);
  const hasDocument = typeof document !== 'undefined';
  const { data: contests = [] } = useContestsQuery();
  const { data: leaderboard } = useLeaderboardQuery(selectedContest ?? undefined);
  const { data: classes = [] } = useClassesQuery();

  const openCreate = () => {
    setEditingContest(null);
    setForm(emptyContestForm);
    setShowCreateModal(true);
  };

  const openEdit = (contest: (typeof contests)[number]) => {
    setEditingContest(contest.id);
    setForm({
      title: contest.title,
      description: contest.description ?? '',
      startTime: contest.startTime ? new Date(contest.startTime).toISOString().slice(0, 16) : '',
      endTime: contest.endTime ? new Date(contest.endTime).toISOString().slice(0, 16) : '',
      visibility: contest.visibility ?? 'public',
      classId: contest.classId ?? '',
    });
    setShowCreateModal(true);
  };

  const saveContest = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      notifyGlobalToast('Vui lòng nhập đầy đủ tên và thời gian kỳ thi.');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      notifyGlobalToast('Thời gian kết thúc phải lớn hơn thời gian bắt đầu.');
      return;
    }
    if (form.visibility === 'private' && !form.classId) {
      notifyGlobalToast('Vui lòng chọn lớp cho kỳ thi riêng tư.');
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        start_time: new Date(form.startTime).toISOString(),
        end_time: new Date(form.endTime).toISOString(),
        is_private: form.visibility === 'private',
        ...(form.visibility === 'private' ? { class_id: form.classId } : {}),
      };
      if (editingContest) await updateContest(editingContest, payload);
      else await createContest(payload);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      setShowCreateModal(false);
      setSelectedContest(null);
      notifyGlobalToast(editingContest ? 'Đã cập nhật kỳ thi.' : 'Đã tạo kỳ thi.', 'success');
    } catch (error) {
      notifyGlobalToast(error instanceof ApiError ? error.message : 'Không thể lưu kỳ thi.');
    }
  };

  const removeContest = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá kỳ thi này?')) return;
    try {
      await deleteContest(id);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      setSelectedContest(null);
      notifyGlobalToast('Đã xoá kỳ thi.', 'success');
    } catch (error) {
      notifyGlobalToast(error instanceof ApiError ? error.message : 'Không thể xoá kỳ thi.');
    }
  };

  const filteredContests = contests.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedContestData = contests.find((c) => c.id === selectedContest);

  const statusColors: Record<string, string> = {
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ended: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
  };

  const statusLabels: Record<string, string> = {
    upcoming: 'Sắp diễn ra',
    running: 'Đang diễn ra',
    ended: 'Đã kết thúc',
  };

  const typeColors: Record<string, string> = {
    ICPC: 'bg-blue-100 text-blue-800 border-blue-200',
    OI: 'bg-purple-100 text-purple-800 border-purple-200',
    Homework: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const standings = Array.isArray(leaderboard) ? leaderboard : leaderboard?.standings ?? [];

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Quản lý kỳ thi</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
        >
          <Plus size={18} /> Tạo kỳ thi mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-yellow-600">{contests.filter((c) => c.status === 'upcoming').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Sắp diễn ra</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-emerald-700">{contests.filter((c) => c.status === 'running').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Đang chạy</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-[#8a8073]">{contests.filter((c) => c.status === 'ended').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Đã kết thúc</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm kỳ thi..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[#193a2b] text-white shadow-sm'
                  : 'bg-white text-[#5c5446] hover:text-[#191919] border border-[#e5dac9]'
              }`}
            >
              {f === 'all' ? 'Tất cả' : statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Contest Detail Modal */}
      {selectedContest && selectedContestData && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--ws-border)]">
              <h3 className="text-lg font-serif font-bold text-[var(--ws-text)]">{selectedContestData.title}</h3>
              <button onClick={() => setSelectedContest(null)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status]}`}>
                  {statusLabels[selectedContestData.status]}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeColors[selectedContestData.type]}`}>
                  {selectedContestData.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] shadow-xs">
                  <p className="text-xs text-[var(--ws-muted)] font-semibold uppercase tracking-wider">Bắt đầu</p>
                  <p className="text-sm text-[var(--ws-text)] font-semibold mt-1">{selectedContestData.startTime}</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] shadow-xs">
                  <p className="text-xs text-[var(--ws-muted)] font-semibold uppercase tracking-wider">Kết thúc</p>
                  <p className="text-sm text-[var(--ws-text)] font-semibold mt-1">{selectedContestData.endTime}</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] shadow-xs">
                  <p className="text-xs text-[var(--ws-muted)] font-semibold uppercase tracking-wider">Người tham gia</p>
                  <p className="text-sm text-[var(--ws-text)] font-semibold mt-1">{selectedContestData.participantCount}</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] shadow-xs">
                  <p className="text-xs text-[var(--ws-muted)] font-semibold uppercase tracking-wider">Số bài</p>
                  <p className="text-sm text-[var(--ws-text)] font-semibold mt-1">{selectedContestData.problemCount}</p>
                </div>
              </div>

              {/* Standings */}
              <h4 className="text-sm font-bold font-serif text-[var(--ws-text)] mb-3">Bảng xếp hạng</h4>
              <div className="bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] overflow-hidden shadow-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--ws-border)] bg-[var(--ws-hover)]">
                      <th className="text-left text-xs font-semibold text-[var(--ws-muted)] py-2.5 px-3 uppercase tracking-wider">#</th>
                      <th className="text-left text-xs font-semibold text-[var(--ws-muted)] py-2.5 px-3 uppercase tracking-wider">Người dùng</th>
                      <th className="text-right text-xs font-semibold text-[var(--ws-muted)] py-2.5 px-3 uppercase tracking-wider">Đã giải</th>
                      <th className="text-right text-xs font-semibold text-[var(--ws-muted)] py-2.5 px-3 uppercase tracking-wider">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.rank} className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-hover)]">
                        <td className="py-2.5 px-3 text-sm text-[var(--ws-muted)]">{s.rank}</td>
                        <td className="py-2.5 px-3 text-sm text-[var(--ws-text)] font-semibold">{'name' in s ? s.name : s.fullName}</td>
                        <td className="py-2.5 px-3 text-sm text-emerald-700 font-bold text-right">{'solved' in s ? s.solved : s.solvedCount}</td>
                        <td className="py-2.5 px-3 text-sm text-[var(--ws-muted)] text-right">{'penalty' in s ? s.penalty : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setSelectedContest(null); openEdit(selectedContestData); }} className="flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-sm">
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-text)] text-sm font-medium rounded-xl hover:bg-[var(--ws-hover)] transition-colors">
                  <Eye size={14} /> Xem bài
                </button>
                <button onClick={() => removeContest(selectedContestData.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 size={14} /> Xoá
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Create Contest Modal */}
      {showCreateModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--ws-border)]">
              <h3 className="text-lg font-serif font-bold text-[var(--ws-text)]">Tạo kỳ thi mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Tên kỳ thi</label>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} type="text" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" placeholder="Nhập tên kỳ thi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Mô tả</label>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none" placeholder="Mô tả kỳ thi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Thời gian bắt đầu</label>
                  <input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Thời gian kết thúc</label>
                  <input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Loại kỳ thi</label>
                  <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ContestForm['visibility'] })} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                    <option value="public">Công khai</option>
                    <option value="private">Riêng tư</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Lớp học</label>
                  <select value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} disabled={form.visibility !== 'private'} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                    <option value="">-- Chọn lớp --</option>
                    {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveContest}
                  className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md"
                >
                  {editingContest ? 'Lưu thay đổi' : 'Tạo kỳ thi'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-muted)] font-medium rounded-xl hover:bg-[var(--ws-hover)] transition-colors"
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Contest List */}
      <div className="space-y-4">
        {filteredContests.map((contest) => (
          <div
            key={contest.id}
            className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md transition-all shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  contest.status === 'running' ? 'bg-emerald-100' : contest.status === 'upcoming' ? 'bg-yellow-100' : 'bg-[#f0ebd9]'
                }`}>
                  <Trophy size={20} className={
                    contest.status === 'running' ? 'text-emerald-700' : contest.status === 'upcoming' ? 'text-yellow-700' : 'text-[#8a8073]'
                  } />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#191919]">{contest.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-[#8a8073] mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${typeColors[contest.type]}`}>
                      {contest.type}
                    </span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {contest.startTime}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {contest.participantCount}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status]}`}>
                  {statusLabels[contest.status]}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedContest(contest.id)}
                    className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-[#191919] hover:bg-[#f7f4eb] transition-colors"
                    title="Xem chi tiết"
                  >
                    <Eye size={16} />
                  </button>
                  <button onClick={() => openEdit(contest)} className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-blue-600 hover:bg-[#f7f4eb] transition-colors" title="Chỉnh sửa">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => removeContest(contest.id)} className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-red-600 hover:bg-[#f7f4eb] transition-colors" title="Xoá">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
