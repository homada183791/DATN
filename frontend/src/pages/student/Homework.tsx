import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
import { formatVN } from '../../utils/dateTime';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Search,
  X,
  Code2,
  Play,
  GraduationCap,
} from 'lucide-react';

export default function Homework() {
  const { enrolledClasses } = useClass();
  const { allHomeworks, problemsOf } = useHomework();
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHomework, setSelectedHomework] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const hasDocument = typeof document !== 'undefined';

  // Chỉ bài tập của các lớp sinh viên đã tham gia
  const enrolledIds = new Set(enrolledClasses.map((c) => c.id));
  const visibleHomeworks = allHomeworks.filter((hw) => enrolledIds.has(hw.classId));

  const filteredHomeworks = visibleHomeworks.filter((hw) => {
    const matchesFilter = filter === 'all' || hw.status === filter;
    const matchesSearch = hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedHw = visibleHomeworks.find((h) => h.id === selectedHomework);
  const hwProblems = selectedHomework ? problemsOf(selectedHomework) : [];

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    closed: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const statusLabels: Record<string, string> = {
    active: 'Đang mở',
    closed: 'Đã đóng',
    upcoming: 'Sắp mở',
  };

  const diffColors: Record<string, string> = {
    Easy: 'text-emerald-700 bg-emerald-100/50',
    Medium: 'text-yellow-700 bg-yellow-100/50',
    Hard: 'text-red-700 bg-red-100/50',
  };

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">Bài tập</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8a8073]">
            {visibleHomeworks.filter((h) => h.status === 'active').length} bài tập đang mở
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
            placeholder="Tìm kiếm bài tập..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'upcoming', 'closed'] as const).map((f) => (
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

      {/* Homework Detail Modal */}
      {selectedHomework && selectedHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setSelectedHomework(null)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <h3 className="text-lg font-serif font-bold text-[#191919]">{selectedHw.title}</h3>
              <button onClick={() => setSelectedHomework(null)} className="text-[#8a8073] hover:text-[#191919]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-[#5c5446]">
                  <Calendar size={14} /> Hạn: {formatVN(selectedHw.deadline)}
                </div>
                <div className="flex items-center gap-2 text-sm text-[#5c5446]">
                  <BookOpen size={14} /> {selectedHw.problemCount} bài
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedHw.status]}`}>
                  {statusLabels[selectedHw.status]}
                </span>
              </div>
              <p className="text-sm text-[#5c5446] mb-6 leading-relaxed">{selectedHw.description}</p>
              <h4 className="text-sm font-bold text-[#191919] font-serif mb-3">Danh sách bài</h4>
              <div className="space-y-2">
                {hwProblems.map((p, i) => {
                  const open = expandedProblem === p.id;
                  const hasLink = !!p.problem_id;
                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-[#e5dac9] overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <button
                          onClick={() => setExpandedProblem(open ? null : p.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <span className="text-xs text-[#8a8073] w-6">{i + 1}.</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${diffColors[p.difficulty]}`}>
                            {p.difficulty}
                          </span>
                          <span className="text-sm text-[#191919] font-medium truncate">{p.title}</span>
                          {hasLink && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold flex-shrink-0">
                              CÓ THỂ NỘP
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-[#8a8073]">{p.points}đ</span>
                          <button
                            onClick={() => setExpandedProblem(open ? null : p.id)}
                            className="p-1.5 bg-[#f0ebd9] rounded-lg text-[#5c5446] hover:bg-[#e5dac9] transition-colors"
                            title={open ? 'Thu gọn đề' : 'Xem đề bài'}
                          >
                            <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                          </button>
                          {hasLink ? (
                            <Link
                              to={`/student/problem/${p.problem_id}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors"
                              title="Vào làm bài và nộp code"
                            >
                              <Play size={12} /> Làm bài
                            </Link>
                          ) : (
                            <span
                              className="p-1.5 bg-[#f0ebd9] rounded-lg text-[#bfae99] cursor-not-allowed"
                              title="Bài này chỉ có đề mô tả, chưa có bài toán để nộp code"
                            >
                              <Play size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div className="px-4 pb-4 pt-1 border-t border-[#e5dac9]/60 animate-fade-in">
                          <p className="text-sm text-[#5c5446] leading-6 whitespace-pre-wrap font-mono text-[13px]">{p.statement}</p>
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
                          {hasLink && (
                            <div className="mt-3">
                              <Link
                                to={`/student/problem/${p.problem_id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-sm transition-colors"
                              >
                                <Play size={14} /> Làm bài ngay
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Homework List */}
      <div className="space-y-4">
        {enrolledClasses.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-xl p-12 text-center shadow-sm">
            <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="font-semibold text-[#191919]">Bạn chưa tham gia lớp nào</p>
            <p className="text-sm text-[#8a8073] mt-1 mb-5">Bài tập chỉ hiển thị khi bạn đã tham gia lớp của giảng viên.</p>
            <Link to="/student/class" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md">
              <GraduationCap size={16} /> Tham gia lớp học
            </Link>
          </div>
        ) : filteredHomeworks.length === 0 ? (
          <div className="bg-white border border-[#e5dac9] rounded-xl p-12 text-center shadow-sm">
            <BookOpen size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">Không tìm thấy bài tập nào trong các lớp của bạn</p>
          </div>
        ) : (
          filteredHomeworks.map((hw) => (
            <div
              key={hw.id}
              className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md hover:border-[#193a2b]/30 transition-all cursor-pointer shadow-sm"
              onClick={() => setSelectedHomework(hw.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold font-serif text-[#191919]">{hw.title}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[hw.status]}`}>
                      {statusLabels[hw.status]}
                    </span>
                  </div>
                  <p className="text-sm text-[#5c5446] mb-3 leading-relaxed">{hw.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#8a8073]">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Hạn: {formatVN(hw.deadline)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={14} /> {hw.problemCount} bài
                    </span>
                    <span className="flex items-center gap-1">
                      <Code2 size={14} /> {hw.className}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={20} className="text-[#8a8073]" />
                  </div>
                  {/* Progress */}
                  <div className="w-40">
                    <div className="flex items-center justify-between text-xs text-[#8a8073] mb-1">
                      <span>Tiến độ</span>
                      <span>{hw.completedCount}/{hw.problemCount}</span>
                    </div>
                    <div className="w-full bg-[#f0ebd9] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          hw.completedCount === hw.problemCount
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                            : 'bg-gradient-to-r from-[#193a2b] to-emerald-600'
                        }`}
                        style={{ width: `${(hw.completedCount / hw.problemCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  {hw.completedCount === hw.problemCount && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 size={14} /> Hoàn thành
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
