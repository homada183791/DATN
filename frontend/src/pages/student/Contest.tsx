import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, Search, Trophy, Users, X } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery, type ContestDto } from '../../api/contests';
import { useAuth } from '../../context/AuthContext';

const statusLabels: Record<NonNullable<ContestDto['status']>, string> = {
  upcoming: 'Sắp diễn ra',
  running: 'Đang diễn ra',
  ended: 'Đã kết thúc',
};

const statusColors: Record<NonNullable<ContestDto['status']>, string> = {
  upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ended: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
};

const typeColors: Record<NonNullable<ContestDto['type']>, string> = {
  ICPC: 'bg-blue-100 text-blue-800',
  OI: 'bg-purple-100 text-purple-800',
  Homework: 'bg-emerald-100 text-emerald-800',
};

const visibilityLabels: Record<NonNullable<ContestDto['visibility']>, string> = {
  public: 'Công khai',
  private: 'Riêng tư',
};

export default function Contest() {
  const { user } = useAuth();
  const { data, isLoading, error } = useContestsQuery();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [registeredContestIds, setRegisteredContestIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`jh-contest-registrations-${user?.id ?? 'guest'}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessError, setAccessError] = useState('');

  const contests = data ?? [];

  const filteredContests = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return contests.filter((contest) => {
      const matchesFilter = filter === 'all' || contest.status === filter;
      const matchesSearch = !search || contest.title.toLowerCase().includes(search) || contest.id.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [contests, filter, searchQuery]);

  const selectedContestData = contests.find((contest) => contest.id === selectedContest);
  const hasDocument = typeof document !== 'undefined';

  const isRegistered = (contestId: string) => registeredContestIds.includes(contestId);

  const registerForContest = (contest: ContestDto) => {
    if (isRegistered(contest.id)) return;

    if (contest.visibility === 'private') {
      const expected = (contest.accessCode ?? '').trim().toLowerCase();
      const provided = accessCodeInput.trim().toLowerCase();
      if (!provided || provided !== expected) {
        setAccessError('Mã truy cập không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }
    }

    setRegisteredContestIds((prev) => {
      const next = [...prev, contest.id];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`jh-contest-registrations-${user?.id ?? 'guest'}`, JSON.stringify(next));
      }
      return next;
    });
    setAccessError('');
    setAccessCodeInput('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-[#191919]">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Kỳ thi</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-[#e5dac9] bg-white px-5 py-4 shadow-sm">
              <div className="h-4 w-56 rounded bg-[#f0ebd9] animate-pulse" />
              <div className="mt-3 h-3 w-80 rounded bg-[#f0ebd9] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#191919]">Không thể tải danh sách kỳ thi</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">Kỳ thi</h2>
        </div>
        <div className="text-sm text-emerald-700 font-medium">
          {contests.filter((contest) => contest.status === 'running').length} kỳ thi đang diễn ra
        </div>
      </div>

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
        <div className="flex gap-2 flex-wrap">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === level ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white text-[#5c5446] hover:text-[#191919] border border-[#e5dac9]'
              }`}
            >
              {level === 'all' ? 'Tất cả' : statusLabels[level]}
            </button>
          ))}
        </div>
      </div>

      {selectedContest && selectedContestData && hasDocument && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <h3 className="text-lg font-serif font-bold text-[#191919]">{selectedContestData.title}</h3>
              <button onClick={() => setSelectedContest(null)} className="text-[#8a8073] hover:text-[#191919]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status ?? 'upcoming']}`}>
                  {statusLabels[selectedContestData.status ?? 'upcoming']}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[selectedContestData.type ?? 'Homework']}`}>
                  {selectedContestData.type ?? 'Homework'}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-white text-[#5c5446] border-[#e5dac9]">
                  {visibilityLabels[selectedContestData.visibility ?? 'public']}
                </span>
              </div>
              <p className="text-sm text-[#5c5446] mb-6 leading-relaxed">
                {selectedContestData.description ?? 'Chưa có mô tả chi tiết cho kỳ thi này.'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Calendar size={14} /> Bắt đầu
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.startTime ?? '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Clock size={14} /> Kết thúc
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.endTime ?? '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Users size={14} /> Người tham gia
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.participantCount ?? 0}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                  <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                    <Trophy size={14} /> Số lượng bài
                  </div>
                  <p className="text-sm text-[#191919] font-semibold">{selectedContestData.problemCount ?? 0}</p>
                </div>
              </div>

              {!isRegistered(selectedContestData.id) ? (
                <div className="mb-6 border border-[#e5dac9] rounded-xl bg-[#f7f4eb] p-4">
                  <h4 className="text-sm font-bold font-serif text-[#191919] mb-1.5">Đăng ký để tham gia kỳ thi</h4>
                  <p className="text-xs text-[#8a8073] mb-3">
                    {selectedContestData.visibility === 'private'
                      ? 'Kỳ thi riêng tư yêu cầu mã truy cập do giảng viên cung cấp.'
                      : 'Kỳ thi công khai, đăng ký chỉ mất một lần.'}
                  </p>
                  {selectedContestData.visibility === 'private' && (
                    <div className="mb-2">
                      <input
                        value={accessCodeInput}
                        onChange={(e) => {
                          setAccessCodeInput(e.target.value);
                          if (accessError) setAccessError('');
                        }}
                        placeholder="Nhập mã truy cập kỳ thi"
                        className="w-full px-3 py-2 bg-white border border-[#e5dac9] rounded-lg text-sm text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                      />
                    </div>
                  )}
                  {accessError && <p className="text-xs text-red-600 font-medium mb-2">{accessError}</p>}
                  <button
                    onClick={() => registerForContest(selectedContestData)}
                    className="w-full py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
                  >
                    {selectedContestData.status === 'running' ? 'Tham gia kỳ thi' : 'Đăng ký kỳ thi'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 rounded-xl border border-[#e5dac9] bg-white p-4 text-sm text-[#5c5446]">
                  Danh sách bài thi sẽ được hiển thị khi backend cung cấp contract chi tiết cho từng contest.
                </div>
              )}

              {isRegistered(selectedContestData.id) && selectedContestData.status === 'running' && (
                <Link to="/student/dashboard" className="w-full py-3 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all flex items-center justify-center gap-2 shadow-md">
                  Vào thi ngay
                </Link>
              )}
              {isRegistered(selectedContestData.id) && selectedContestData.status === 'upcoming' && (
                <button className="w-full py-3 bg-[#cc5a37] text-white font-medium rounded-xl hover:bg-[#b04829] transition-all flex items-center justify-center gap-2 shadow-md">
                  Đã đăng ký
                </button>
              )}
            </div>
          </div>
        </div>
      , document.body)}

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
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contest.status === 'running' ? 'bg-emerald-100' : contest.status === 'upcoming' ? 'bg-yellow-100' : 'bg-[#f0ebd9]'}`}>
                      <Trophy size={20} className={contest.status === 'running' ? 'text-emerald-700' : contest.status === 'upcoming' ? 'text-yellow-700' : 'text-[#8a8073]'} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-serif text-[#191919]">{contest.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-[#8a8073] mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColors[contest.type ?? 'Homework']}`}>
                          {contest.type ?? 'Homework'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-white text-[#5c5446] border-[#e5dac9]">
                          {visibilityLabels[contest.visibility ?? 'public']}
                        </span>
                        {contest.className && <span className="text-xs text-[#8a8073]">{contest.className}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 text-sm text-[#8a8073]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {contest.startTime ?? '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {contest.participantCount ?? 0} người
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status ?? 'upcoming']}`}>
                    {statusLabels[contest.status ?? 'upcoming']}
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
