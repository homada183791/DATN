import { useState } from 'react';
import { contests } from '../../data/mockData';
import {
  Trophy,
  Users,
  Calendar,
  Search,
  X,
  ChevronRight,
  Clock,
} from 'lucide-react';

export default function Contest() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContest, setSelectedContest] = useState<string | null>(null);

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
    ICPC: 'bg-blue-100 text-blue-850',
    OI: 'bg-purple-100 text-purple-850',
    Homework: 'bg-emerald-100 text-emerald-850',
  };

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Kỳ thi</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-emerald-700 font-medium">
            {contests.filter((c) => c.status === 'running').length} kỳ thi đang diễn ra
          </span>
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
      {selectedContest && selectedContestData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <h3 className="text-lg font-serif font-bold text-[#191919]">{selectedContestData.title}</h3>
              <button onClick={() => setSelectedContest(null)} className="text-[#8a8073] hover:text-[#191919]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status]}`}>
                  {statusLabels[selectedContestData.status]}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[selectedContestData.type]}`}>
                  {selectedContestData.type}
                </span>
              </div>
              <p className="text-sm text-[#5c5446] mb-6 leading-relaxed">{selectedContestData.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Calendar size={14} /> Bắt đầu
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.startTime}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Clock size={14} /> Kết thúc
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.endTime}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Users size={14} /> Người tham gia
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.participantCount}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Trophy size={14} /> Số lượng bài
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.problemCount}</p>
                </div>
              </div>

              {selectedContestData.status === 'running' && (
                <button className="w-full py-3 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all flex items-center justify-center gap-2 shadow-md">
                  Tham gia ngay
                </button>
              )}
              {selectedContestData.status === 'upcoming' && (
                <button className="w-full py-3 bg-[#cc5a37] text-white font-medium rounded-xl hover:bg-[#b04829] transition-all flex items-center justify-center gap-2 shadow-md">
                  Đăng ký tham gia
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contest List */}
      <div className="space-y-4">
        {filteredContests.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-xl p-12 text-center shadow-sm">
            <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">Không tìm thấy kỳ thi nào</p>
          </div>
        ) : (
          filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md hover:border-[#193a2b]/30 transition-all cursor-pointer shadow-sm"
              onClick={() => setSelectedContest(contest.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColors[contest.type]}`}>
                          {contest.type}
                        </span>
                        {contest.className && (
                          <span className="text-xs text-[#8a8073]">{contest.className}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 text-sm text-[#8a8073]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {contest.startTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {contest.participantCount} người
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status]}`}>
                    {statusLabels[contest.status]}
                  </span>
                  <ChevronRight size={20} className="text-[#8a8073]" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
