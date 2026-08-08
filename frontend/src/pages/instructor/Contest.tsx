import { useState } from 'react';
import { createPortal } from 'react-dom';
import { contests } from '../../data/mockData';
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

export default function InstructorContest() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const hasDocument = typeof document !== 'undefined';

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

  const standings = [
    { rank: 1, name: 'Bùi Thị H', solved: 5, penalty: 120 },
    { rank: 2, name: 'Phạm Thị D', solved: 4, penalty: 180 },
    { rank: 3, name: 'Nguyễn Văn A', solved: 4, penalty: 210 },
    { rank: 4, name: 'Võ Thị F', solved: 3, penalty: 150 },
    { rank: 5, name: 'Lê Văn C', solved: 3, penalty: 200 },
  ];

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Quản lý kỳ thi</h2>
        <button
          onClick={() => setShowCreateModal(true)}
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
                        <td className="py-2.5 px-3 text-sm text-[var(--ws-text)] font-semibold">{s.name}</td>
                        <td className="py-2.5 px-3 text-sm text-emerald-700 font-bold text-right">{s.solved}</td>
                        <td className="py-2.5 px-3 text-sm text-[var(--ws-muted)] text-right">{s.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-sm">
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-text)] text-sm font-medium rounded-xl hover:bg-[var(--ws-hover)] transition-colors">
                  <Eye size={14} /> Xem bài
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors">
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
                <input type="text" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" placeholder="Nhập tên kỳ thi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Mô tả</label>
                <textarea rows={3} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none" placeholder="Mô tả kỳ thi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Thời gian bắt đầu</label>
                  <input type="datetime-local" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Thời gian kết thúc</label>
                  <input type="datetime-local" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Loại kỳ thi</label>
                  <select className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                    <option>ICPC</option>
                    <option>OI</option>
                    <option>Homework</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Lớp học</label>
                  <select className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                    <option>CTDL&GT - INT1009</option>
                    <option>Lập trình C++ - INT1008</option>
                    <option>PTTKTT - INT2010</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md"
                >
                  Tạo kỳ thi
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
                  <button className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-blue-600 hover:bg-[#f7f4eb] transition-colors" title="Chỉnh sửa">
                    <Edit3 size={16} />
                  </button>
                  <button className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-red-600 hover:bg-[#f7f4eb] transition-colors" title="Xoá">
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
