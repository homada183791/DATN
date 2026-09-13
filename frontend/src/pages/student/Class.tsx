import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework, deadlineProgress } from '../../context/HomeworkContext';
import { formatVN } from '../../utils/dateTime';
import { contests } from '../../data/legacyData';
import {
  GraduationCap,
  Users,
  BookOpen,
  Trophy,
  Calendar,
  Search,
  X,
  Clock,
  User,
  Hash,
  UserPlus,
  LogOut,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  Play,
} from 'lucide-react';

export default function ClassPage() {
  const { allClasses, enrolledClasses, membersOf, joinByCode, leaveClass, isEnrolled } = useClass();
  const { homeworksOfClass, problemsOf } = useHomework();
  const [searchQuery, setSearchQuery] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [tab, setTab] = useState<'my' | 'explore'>('my');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedHw, setSelectedHw] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const hasDocument = typeof document !== 'undefined';

  /* banner khi vừa join qua link /join/CODE */
  useEffect(() => {
    const flag = sessionStorage.getItem('jh-joined');
    if (flag) {
      const cls = allClasses.find((c) => c.id === flag);
      if (cls) setJoinMsg({ ok: true, text: `Đã tham gia lớp "${cls.name}" thành công!` });
      sessionStorage.removeItem('jh-joined');
      setTimeout(() => setJoinMsg(null), 4000);
    }
    const err = sessionStorage.getItem('jh-joined-error');
    if (err) {
      setJoinMsg({ ok: false, text: err });
      sessionStorage.removeItem('jh-joined-error');
      setTimeout(() => setJoinMsg(null), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClassData = allClasses.find((c) => c.id === selectedClass);
  const selectedClassHws = selectedClass ? homeworksOfClass(selectedClass) : [];
  const selectedClassContests = contests.filter((c) => c.classId === selectedClass);
  const hwDetail = selectedHw
    ? selectedClassHws.find((h) => h.id === selectedHw)
    : null;

  const discoverable = allClasses.filter(
    (c) =>
      !isEnrolled(c.id) &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoin = async (code: string) => {
    const res = await joinByCode(code);
    setJoinMsg({ ok: res.ok, text: res.message });
    if (res.ok) setCodeInput('');
    setTimeout(() => setJoinMsg(null), 4000);
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* header + join by code */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">Lớp học</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {enrolledClasses.length} lớp đang tham gia • khám phá thêm hoặc nhập mã mời từ giảng viên.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-56">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && codeInput.trim() && handleJoin(codeInput)}
              placeholder="Mã lớp (VD: INT1009)"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[13px] font-mono text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            />
          </div>
          <button
            onClick={() => codeInput.trim() && handleJoin(codeInput)}
            disabled={!codeInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus size={15} /> Tham gia
          </button>
        </div>
      </div>

      {/* join toast */}
      {joinMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium animate-slide-up ${
            joinMsg.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {joinMsg.ok ? <CheckCircle2 size={16} /> : <X size={16} />}
          {joinMsg.text}
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'my' ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white border border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
          }`}
        >
          Lớp của tôi ({enrolledClasses.length})
        </button>
        <button
          onClick={() => setTab('explore')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'explore' ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white border border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
          }`}
        >
          Khám phá
        </button>
      </div>

      {/* ===== MY CLASSES ===== */}
      {tab === 'my' && (
        <>
          {enrolledClasses.length === 0 ? (
            <div className="bg-white border border-[#e5dac9] rounded-xl p-14 text-center shadow-sm">
              <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
              <p className="font-semibold text-[#191919]">Bạn chưa tham gia lớp nào</p>
              <p className="text-sm text-[#8a8073] mt-1 mb-5">Nhập mã mời từ giảng viên hoặc khám phá các lớp đang mở.</p>
              <button
                onClick={() => setTab('explore')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md"
              >
                <Search size={15} /> Khám phá lớp học
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md hover:border-[#193a2b]/30 transition-all cursor-pointer group shadow-sm flex flex-col"
                  onClick={() => setSelectedClass(cls.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap size={24} className="text-white" />
                    </div>
                    {leaveConfirmId === cls.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-red-600 font-medium">Rời lớp?</span>
                        <button
                          onClick={async (e) => { e.stopPropagation(); await leaveClass(cls.id); setLeaveConfirmId(null); }}
                          className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                        >Xác nhận</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLeaveConfirmId(null); }}
                          className="px-2 py-1 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                        >Huỷ</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLeaveConfirmId(cls.id); }}
                        className="flex items-center gap-1 text-[11px] text-[#8a8073] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rời lớp"
                      >
                        <LogOut size={12} /> Rời lớp
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold font-serif text-[#191919] mb-1">{cls.name}</h3>
                  <p className="text-sm text-[#8a8073] mb-1">{cls.code} • {cls.semester}</p>
                  <p className="text-xs text-[#8a8073] mb-4">GV: {cls.instructor}</p>
                  <div className="flex items-center gap-4 text-sm text-[#8a8073] mt-auto">
                    <span className="flex items-center gap-1"><Users size={14} /> {membersOf(cls.id).length}</span>
                    <span className="flex items-center gap-1"><BookOpen size={14} /> {cls.homeworkCount}</span>
                    <span className="flex items-center gap-1"><Trophy size={14} /> {cls.contestCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== EXPLORE ===== */}
      {tab === 'explore' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên lớp, mã lớp hoặc giảng viên…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
            />
          </div>

          <div className="bg-white border border-[#e5dac9] rounded-2xl overflow-hidden shadow-sm">
            {discoverable.map((cls) => (
              <div key={cls.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-[#f7f4eb]/70 transition-colors">
                <div className="w-10 h-10 bg-[#f0ebd9] rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={20} className="text-[#193a2b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#191919]">{cls.name}</p>
                    <span className="text-[10.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#f0ebd9] border border-[#e5dac9] text-[#193a2b]">{cls.code}</span>
                  </div>
                  <p className="text-xs text-[#8a8073] mt-0.5">
                    {cls.instructor} • {cls.semester} • {membersOf(cls.id).length} sinh viên
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedClass(cls.id)}
                    className="px-3 py-1.5 text-xs font-medium text-[#5c5446] border border-[#e5dac9] rounded-lg hover:bg-[#f7f4eb] transition-colors"
                  >
                    Chi tiết
                  </button>
                  <button
                    onClick={() => handleJoin(cls.code)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] shadow-sm"
                  >
                    <UserPlus size={13} /> Tham gia
                  </button>
                </div>
              </div>
            ))}
            {discoverable.length === 0 && (
              <p className="p-10 text-center text-sm text-[#8a8073]">Không tìm thấy lớp nào phù hợp.</p>
            )}
          </div>
        </div>
      )}

      {/* ===== detail modal ===== */}
      {selectedClass && selectedClassData && !hwDetail && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4" onClick={() => setSelectedClass(null)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#191919]">{selectedClassData.name}</h3>
                <p className="text-sm text-[#8a8073] mt-1">{selectedClassData.code} • {selectedClassData.semester}</p>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <p className="text-sm text-[#5c5446] mb-6 leading-relaxed">{selectedClassData.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <Users size={20} className="text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{membersOf(selectedClassData.id).length}</p>
                  <p className="text-xs text-[#8a8073] mt-0.5">Sinh viên</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <BookOpen size={20} className="text-emerald-600 mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{selectedClassData.homeworkCount}</p>
                  <p className="text-xs text-[#8a8073] mt-0.5">Bài tập</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <Trophy size={20} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{selectedClassData.contestCount}</p>
                  <p className="text-xs text-[#8a8073] mt-0.5">Kỳ thi</p>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                  <User size={14} /> Giảng viên
                </div>
                <p className="text-sm text-[#191919] font-semibold">{selectedClassData.instructor}</p>
              </div>

              {selectedClassHws.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold font-serif text-[#191919] mb-3 flex items-center gap-1.5">
                    <ClipboardList size={15} /> Bài tập ({selectedClassHws.length})
                  </h4>
                  <div className="space-y-2.5">
                    {selectedClassHws.map((hw) => {
                      const p = deadlineProgress(hw.deadline);
                      return (
                        <button
                          key={hw.id}
                          onClick={() => setSelectedHw(hw.id)}
                          className="w-full text-left p-3.5 bg-white rounded-xl border border-[#e5dac9] hover:bg-[var(--ws-hover)] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-[#191919] font-semibold truncate">{hw.title}</p>
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-[11px] font-semibold ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                                {p.label}
                              </span>
                              <ChevronRight size={14} className="text-[#8a8073]" />
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#8a8073] mb-1.5">
                            <span className="flex items-center gap-1"><Clock size={11} /> {formatVN(hw.deadline)}</span>
                            <span className="flex items-center gap-1"><BookOpen size={11} /> {hw.problemCount} bài</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.overdue ? 'bg-[#cc5a37]' : p.daysLeft <= 3 ? 'bg-yellow-500' : 'bg-[#193a2b]'}`}
                              style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* link sang trang bài tập về nhà riêng */}
                  <Link
                    to="/student/homework"
                    onClick={() => setSelectedClass(null)}
                    className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-[#193a2b] border border-[#193a2b]/30 rounded-xl hover:bg-[#193a2b] hover:text-white transition-colors"
                  >
                    <ClipboardList size={13} /> Xem tất cả bài tập về nhà
                  </Link>
                </div>
              )}

              {selectedClassContests.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold font-serif text-[#191919] mb-3">Kỳ thi</h4>
                  <div className="space-y-2">
                    {selectedClassContests.map((contest) => (
                      <div key={contest.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#e5dac9]">
                        <div>
                          <p className="text-sm text-[#191919] font-semibold">{contest.title}</p>
                          <p className="text-xs text-[#8a8073] flex items-center gap-1 mt-1"><Calendar size={12} /> {contest.startTime}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          contest.status === 'running' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          contest.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]'
                        }`}>
                          {contest.status === 'running' ? 'Đang diễn ra' : contest.status === 'upcoming' ? 'Sắp tới' : 'Đã kết thúc'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                {isEnrolled(selectedClassData.id) ? (
                  leaveConfirmId === `modal-${selectedClassData.id}` ? (
                    <div className="flex gap-3">
                      <button
                        onClick={async () => { await leaveClass(selectedClassData.id); setSelectedClass(null); setLeaveConfirmId(null); }}
                        className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut size={15} /> Xác nhận rời lớp
                      </button>
                      <button
                        onClick={() => setLeaveConfirmId(null)}
                        className="px-5 py-2.5 bg-[#f0ebd9] text-[#5c5446] border border-[#e5dac9] font-medium rounded-xl hover:bg-[#e5dac9]"
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setLeaveConfirmId(`modal-${selectedClassData.id}`)}
                      className="w-full py-2.5 bg-red-50 text-red-700 border border-red-200 font-medium rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut size={15} /> Rời lớp
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => { handleJoin(selectedClassData.code); setSelectedClass(null); }}
                    className="w-full py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} /> Tham gia lớp này
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== homework detail modal (deadline + đề bài) ===== */}
      {hwDetail && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[95] flex items-center justify-center p-4" onClick={() => setSelectedHw(null)}>
          <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] sticky top-0 bg-[#f7f4eb] z-10">
              <h3 className="font-bold font-serif text-[16px] text-[#191919]">{hwDetail.title}</h3>
              <button onClick={() => setSelectedHw(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* deadline tracking */}
              {(() => {
                const p = deadlineProgress(hwDetail.deadline);
                return (
                  <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5 text-[#8a8073]"><Clock size={13} /> Hạn nộp: <span className="font-medium text-[#5c5446]">{formatVN(hwDetail.deadline)}</span></span>
                      <span className={`font-semibold ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-emerald-700'}`}>{p.label}</span>
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

              {hwDetail.description && <p className="text-sm text-[#5c5446] leading-relaxed">{hwDetail.description}</p>}

              {/* problem list with expandable statements */}
              <div>
                <h4 className="text-sm font-bold font-serif text-[#191919] mb-2">Danh sách bài toán</h4>
                <div className="space-y-2">
                  {problemsOf(hwDetail.id).map((p, i) => {
                    const open = expandedProblem === p.id;
                    const dc: Record<string, string> = {
                      Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      Hard: 'bg-red-100 text-red-800 border-red-200',
                    };
                    const dl: Record<string, string> = { Easy: 'Dễ', Medium: 'TB', Hard: 'Khó' };
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-[#e5dac9] overflow-hidden">
                        <button onClick={() => setExpandedProblem(open ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--ws-hover)] transition-colors">
                          <span className="text-xs text-[#8a8073] font-mono w-5">{i + 1}.</span>
                          <span className="flex-1 text-sm font-medium text-[#191919] truncate">{p.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${dc[p.difficulty]}`}>{dl[p.difficulty]}</span>
                          <span className="text-[11px] text-[#8a8073] w-9 text-right">{p.points}đ</span>
                          {p.problem_id ? (
                            <Link
                              to={`/student/problem/${p.problem_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-[#193a2b] text-white text-[11px] font-semibold rounded-lg hover:bg-[#143022] transition-colors flex-shrink-0"
                              title="Làm bài và nộp code"
                            >
                              <Play size={11} /> Làm bài
                            </Link>
                          ) : (
                            <ChevronRight size={14} className={`text-[#8a8073] transition-transform ${open ? 'rotate-90' : ''} flex-shrink-0`} />
                          )}
                        </button>
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
