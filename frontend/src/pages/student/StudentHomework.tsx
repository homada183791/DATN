import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework, deadlineProgress } from '../../context/HomeworkContext';
import { formatVN } from '../../utils/dateTime';
import {
  ClipboardList,
  Search,
  X,
  Clock,
  BookOpen,
  Calendar,
  Play,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Filter,
} from 'lucide-react';

const diffColors: Record<string, string> = {
  Easy:   'text-emerald-800 bg-emerald-100',
  Medium: 'text-yellow-800 bg-yellow-100',
  Hard:   'text-red-800 bg-red-100',
};

export default function StudentHomework() {
  const { enrolledClasses } = useClass();
  const { allHomeworks, problemsOf } = useHomework();
  const [searchParams] = useSearchParams();

  const [search,           setSearch]           = useState('');
  const [statusFilter,     setStatusFilter]     = useState<'all' | 'active' | 'closed'>('all');
  const [classFilter,      setClassFilter]      = useState<string>(searchParams.get('class') ?? 'all');
  const [selectedHwId,     setSelectedHwId]     = useState<string | null>(null);
  const [expandedProblem,  setExpandedProblem]  = useState<string | null>(null);
  const hasDocument = typeof document !== 'undefined';

  // Chỉ lấy homework của các lớp đã tham gia
  const enrolledIds  = useMemo(() => new Set(enrolledClasses.map((c) => c.id)), [enrolledClasses]);
  const myHomeworks  = useMemo(() => allHomeworks.filter((hw) => enrolledIds.has(hw.classId)), [allHomeworks, enrolledIds]);

  const filtered = useMemo(() => {
    return myHomeworks.filter((hw) => {
      const matchSearch = !search.trim() ||
        hw.title.toLowerCase().includes(search.toLowerCase()) ||
        hw.className.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || hw.status === statusFilter;
      const matchClass  = classFilter === 'all' || hw.classId === classFilter;
      return matchSearch && matchStatus && matchClass;
    });
  }, [myHomeworks, search, statusFilter, classFilter]);

  const selectedHw    = selectedHwId ? myHomeworks.find((h) => h.id === selectedHwId) ?? null : null;
  const hwProblems    = selectedHwId ? problemsOf(selectedHwId) : [];

  const activeCount   = myHomeworks.filter((h) => h.status === 'active').length;
  const closedCount   = myHomeworks.filter((h) => h.status === 'closed').length;

  return (
    <div className="space-y-6 text-[#191919]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#191919]">Bài tập về nhà</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {myHomeworks.length} bài tập •{' '}
            <span className="text-emerald-700 font-medium">{activeCount} đang mở</span>
            {closedCount > 0 && <> • <span className="text-[#cc5a37] font-medium">{closedCount} đã đóng</span></>}
          </p>
        </div>
        <Link
          to="/student/class"
          className="flex items-center gap-2 text-sm text-[#8a8073] hover:text-[#193a2b] transition-colors"
        >
          <GraduationCap size={15} /> Quản lý lớp học
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="bg-white border border-[#e5dac9] rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài tập, tên lớp..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-sm text-[#191919] outline-none placeholder:text-[#bfae99] focus:ring-2 focus:ring-[#193a2b]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8073] hover:text-[#191919]">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[#8a8073]" />
            <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">Trạng thái:</span>
            <div className="flex gap-1.5">
              {([
                { value: 'all',    label: 'Tất cả' },
                { value: 'active', label: 'Đang mở' },
                { value: 'closed', label: 'Đã đóng' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === value
                      ? value === 'active' ? 'bg-emerald-600 text-white'
                        : value === 'closed' ? 'bg-[#cc5a37] text-white'
                        : 'bg-[#193a2b] text-white'
                      : 'bg-[#f0ebd9] text-[#5c5446] hover:bg-[#e5dac9]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Class filter */}
          {enrolledClasses.length > 1 && (
            <>
              <div className="h-5 w-px bg-[#e5dac9] hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-[#8a8073]" />
                <span className="text-xs font-semibold text-[#8a8073] uppercase tracking-wider">Lớp:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setClassFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      classFilter === 'all' ? 'bg-[#193a2b] text-white' : 'bg-[#f0ebd9] text-[#5c5446] hover:bg-[#e5dac9]'
                    }`}
                  >
                    Tất cả
                  </button>
                  {enrolledClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => setClassFilter(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all truncate max-w-[120px] ${
                        classFilter === cls.id ? 'bg-[#193a2b] text-white' : 'bg-[#f0ebd9] text-[#5c5446] hover:bg-[#e5dac9]'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Homework list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
          <ClipboardList size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="font-semibold text-[#191919]">
            {myHomeworks.length === 0 ? 'Bạn chưa có bài tập về nhà nào' : 'Không tìm thấy bài tập'}
          </p>
          <p className="text-sm text-[#8a8073] mt-1">
            {myHomeworks.length === 0
              ? 'Tham gia lớp học để nhận bài tập từ giảng viên.'
              : search ? `Không có kết quả cho "${search}"` : 'Thử thay đổi bộ lọc.'}
          </p>
          {myHomeworks.length === 0 && (
            <Link to="/student/class" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md">
              <GraduationCap size={16} /> Vào Lớp học
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((hw) => {
            const p = deadlineProgress(hw.deadline);
            const tasks = problemsOf(hw.id);
            const hasLinkable = tasks.some((t) => !!t.problem_id);
            return (
              <div
                key={hw.id}
                className="group bg-white border border-[#e5dac9] rounded-2xl p-5 shadow-sm hover:border-[#193a2b]/40 hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setSelectedHwId(hw.id); setExpandedProblem(null); }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[#191919] group-hover:text-[#193a2b]">{hw.title}</h3>
                      {/* Status badge */}
                      {hw.status === 'active' ? (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                          <CheckCircle2 size={10} /> Đang mở
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-semibold">
                          <AlertTriangle size={10} /> Đã đóng
                        </span>
                      )}
                      {hasLinkable && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold">
                          CÓ THỂ NỘP
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#8a8073]">
                      <span className="flex items-center gap-1"><GraduationCap size={12} />{hw.className}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} />{hw.problemCount} bài</span>
                      <span className={`flex items-center gap-1 font-medium ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-[#5c5446]'}`}>
                        <Clock size={12} />{formatVN(hw.deadline)}
                      </span>
                    </div>
                  </div>

                  {/* Right: deadline label + arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-semibold ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                      {p.label}
                    </span>
                    <ChevronRight size={18} className="text-[#d8cfbe] group-hover:text-[#193a2b] transition-colors" />
                  </div>
                </div>

                {/* Deadline progress */}
                <div className="mt-3 w-full h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${p.overdue ? 'bg-[#cc5a37]' : p.daysLeft <= 3 ? 'bg-yellow-500' : 'bg-[#193a2b]'}`}
                    style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Detail Modal ===== */}
      {selectedHw && hasDocument && createPortal(
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[95] flex items-center justify-center p-4"
          onClick={() => setSelectedHwId(null)}
        >
          <div
            className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] sticky top-0 bg-[#f7f4eb] z-10">
              <div>
                <h3 className="font-bold font-serif text-lg text-[#191919]">{selectedHw.title}</h3>
                <p className="text-xs text-[#8a8073] mt-0.5 flex items-center gap-1">
                  <GraduationCap size={11} />{selectedHw.className}
                </p>
              </div>
              <button onClick={() => setSelectedHwId(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Deadline tracking */}
              {(() => {
                const p = deadlineProgress(selectedHw.deadline);
                return (
                  <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5 text-[#8a8073]">
                        <Calendar size={13} /> Hạn nộp:
                        <span className="font-semibold text-[#5c5446]">{formatVN(selectedHw.deadline)}</span>
                      </span>
                      <span className={`font-bold ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                        {p.label}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#f0ebd9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.overdue ? 'bg-[#cc5a37]' : p.daysLeft <= 3 ? 'bg-gradient-to-r from-yellow-500 to-[#cc5a37]' : 'bg-gradient-to-r from-[#193a2b] to-emerald-500'}`}
                        style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Description */}
              {selectedHw.description && (
                <p className="text-sm text-[#5c5446] leading-relaxed">{selectedHw.description}</p>
              )}

              {/* Problem list */}
              <div>
                <h4 className="text-sm font-bold font-serif text-[#191919] mb-3">
                  Danh sách bài toán ({hwProblems.length})
                </h4>
                {hwProblems.length === 0 ? (
                  <p className="text-sm text-[#8a8073] text-center py-6">Bài tập chưa có bài toán nào.</p>
                ) : (
                  <div className="space-y-2">
                    {hwProblems.map((p, i) => {
                      const open = expandedProblem === p.id;
                      const hasLink = !!p.problem_id;
                      return (
                        <div key={p.id} className="bg-white rounded-xl border border-[#e5dac9] overflow-hidden">
                          {/* Row header */}
                          <div className="flex items-center gap-3 p-3">
                            <button
                              onClick={() => setExpandedProblem(open ? null : p.id)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <span className="text-xs text-[#8a8073] font-mono w-5 flex-shrink-0">{i + 1}.</span>
                              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${diffColors[p.difficulty] ?? 'bg-[#f0ebd9] text-[#5c5446]'}`}>
                                {p.difficulty}
                              </span>
                              <span className="text-sm font-medium text-[#191919] truncate">{p.title}</span>
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
                              >
                                <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                              </button>
                              {hasLink ? (
                                <Link
                                  to={`/student/problem/${p.problem_id}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Play size={12} /> Làm bài
                                </Link>
                              ) : (
                                <span className="p-1.5 bg-[#f0ebd9] rounded-lg text-[#bfae99] cursor-not-allowed" title="Chỉ xem đề, chưa có bài toán để nộp code">
                                  <Play size={14} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
                          {open && (
                            <div className="px-4 pb-4 pt-1 border-t border-[#e5dac9]/60 animate-fade-in">
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
                              {hasLink && (
                                <div className="mt-3">
                                  <Link
                                    to={`/student/problem/${p.problem_id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
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
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
