import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useClass, Member } from '../../context/ClassContext';
import { useHomework, deadlineProgress, HomeworkProblem } from '../../context/HomeworkContext';
import ProblemManager from '../../components/ProblemManager';
import {
  GraduationCap,
  Users,
  BookOpen,
  Trophy,
  Plus,
  X,
  Link2,
  Hash,
  Copy,
  Check,
  Trash2,
  Eye,
  UserMinus,
  Calendar,
  ClipboardList,
  Clock,
} from 'lucide-react';

export default function InstructorClass() {
  const { myClasses, createClass, deleteClass, membersOf, removeMember } = useClass();
  const { homeworksOfClass, createHomework, refetch } = useHomework();

  useEffect(() => {
    refetch();
  }, [refetch]);
  const [showCreate, setShowCreate] = useState(false);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [hwClassId, setHwClassId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isSavingHw, setIsSavingHw] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', semester: 'Học kỳ 2 - 2024/2025', description: '' });
  const [formError, setFormError] = useState('');

  const [hwForm, setHwForm] = useState({ title: '', description: '', deadline: '' });
  const [hwProblems, setHwProblems] = useState<HomeworkProblem[]>([]);
  const [hwError, setHwError] = useState('');
  const hasDocument = typeof document !== 'undefined';
  const hwClass = myClasses.find((c) => c.id === hwClassId);

  const openHwModal = (classId: string) => {
    setHwForm({ title: '', description: '', deadline: '' });
    setHwProblems([]);
    setHwError('');
    setHwClassId(classId);
  };

  const saveHomework = async () => {
    if (!hwClass) return;
    if (hwForm.title.trim().length < 3) return setHwError('Tiêu đề cần ít nhất 3 ký tự.');
    if (!hwForm.deadline) return setHwError('Vui lòng chọn hạn nộp.');
    if (hwProblems.length === 0) return setHwError('Cần ít nhất 1 bài toán trong bài tập.');
    setIsSavingHw(true);
    setHwError('');
    try {
      await createHomework({
        title: hwForm.title.trim(),
        description: hwForm.description.trim(),
        deadline: hwForm.deadline.replace('T', ' '),
        problems: hwProblems,
        classId: hwClass.id,
        className: `${hwClass.name} - ${hwClass.code}`,
        totalStudents: membersOf(hwClass.id).length,
      });
      await refetch();
      setHwClassId(null);
    } catch (e: any) {
      setHwError(e.message || 'Có lỗi xảy ra khi giao bài.');
    } finally {
      setIsSavingHw(false);
    }
  };

  const rosterClass = myClasses.find((c) => c.id === rosterId);
  const roster: Member[] = rosterClass ? membersOf(rosterClass.id) : [];

  const totalStudents = myClasses.reduce((sum, c) => sum + membersOf(c.id).length, 0);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const inviteLink = (code: string) => `${window.location.origin}/join/${code}`;

  const handleCreate = async () => {
    if (form.name.trim().length < 3) {
      setFormError('Tên lớp cần ít nhất 3 ký tự.');
      return;
    }
    setIsCreatingClass(true);
    setFormError('');
    try {
      await createClass({ name: form.name.trim(), semester: form.semester, description: form.description.trim() });
      setForm({ name: '', semester: 'Học kỳ 2 - 2024/2025', description: '' });
      setShowCreate(false);
    } catch (e: any) {
      setFormError(e.message || 'Có lỗi xảy ra khi tạo lớp.');
    } finally {
      setIsCreatingClass(false);
    }
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">Quản lý lớp học</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            Chỉ hiển thị {myClasses.length} lớp do bạn tạo • chia sẻ mã hoặc link mời để sinh viên tham gia.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
        >
          <Plus size={18} /> Tạo lớp mới
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <GraduationCap size={20} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myClasses.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Lớp đang quản lý</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <Users size={20} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{totalStudents}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Tổng sinh viên</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <BookOpen size={20} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myClasses.reduce((s, c) => s + homeworksOfClass(c.id).length, 0)}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">Bài tập đã giao</p>
        </div>
      </div>

      {/* class cards */}
      {myClasses.length === 0 ? (
        <div className="bg-white border border-[#e5dac9] rounded-xl p-14 text-center shadow-sm">
          <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="font-semibold text-[#191919]">Bạn chưa tạo lớp nào</p>
          <p className="text-sm text-[#8a8073] mt-1 mb-5">Tạo lớp đầu tiên và gửi link mời cho sinh viên.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md"
          >
            <Plus size={16} /> Tạo lớp mới
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {myClasses.map((cls) => {
            const members = membersOf(cls.id);
            return (
              <div
                key={cls.id}
                className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md hover:border-[#193a2b]/30 transition-all shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap size={24} className="text-white" />
                    </div>
                    <div>
                      <Link to={`/instructor/class/${cls.id}`} className="group/link block">
                        <h3 className="text-lg font-bold font-serif text-[#191919] group-hover/link:text-[#193a2b] group-hover/link:underline transition-colors flex items-center gap-1.5">
                          {cls.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-[#8a8073] flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> {cls.semester}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-1 rounded-md bg-[#f0ebd9] border border-[#e5dac9] text-[#193a2b]">
                    <Hash size={11} /> {cls.code}
                  </span>
                </div>

                <p className="text-sm text-[#5c5446] mb-4 leading-relaxed flex-1">
                  {cls.description || 'Chưa có mô tả.'}
                </p>

                <div className="flex items-center gap-4 text-sm text-[#8a8073] mb-4">
                  <span className="flex items-center gap-1"><Users size={14} /> {members.length}</span>
                  <span className="flex items-center gap-1"><ClipboardList size={14} /> {homeworksOfClass(cls.id).length}</span>
                  <span className="flex items-center gap-1"><Trophy size={14} /> {cls.contestCount}</span>
                </div>

                {/* invite link */}
                <div className="flex items-center gap-2 p-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg mb-4">
                  <Link2 size={14} className="text-[#8a8073] flex-shrink-0" />
                  <span className="text-[11.5px] font-mono text-[#5c5446] truncate flex-1">{inviteLink(cls.code)}</span>
                  <button
                    onClick={() => copy(inviteLink(cls.code), `link-${cls.id}`)}
                    className="p-1.5 rounded-md text-[#193a2b] hover:bg-[#e5dac9] transition-colors flex-shrink-0"
                    title="Sao chép link mời"
                  >
                    {copied === `link-${cls.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => copy(cls.code, `code-${cls.id}`)}
                    className="p-1.5 rounded-md text-[#193a2b] hover:bg-[#e5dac9] transition-colors flex-shrink-0"
                    title="Sao chép mã lớp"
                  >
                    {copied === `code-${cls.id}` ? <Check size={14} className="text-emerald-600" /> : <Hash size={14} />}
                  </button>
                </div>

                {/* homework preview list (nằm giữa link join và các nút) */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#5c5446] mb-2">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-[#193a2b]" />
                      Bài tập ({homeworksOfClass(cls.id).length})
                    </span>
                    {homeworksOfClass(cls.id).length > 0 && (
                      <Link
                        to="/instructor/homework"
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                      >
                        Tất cả &rarr;
                      </Link>
                    )}
                  </div>

                  {homeworksOfClass(cls.id).length === 0 ? (
                    <div className="px-3 py-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl text-center">
                      <p className="text-xs text-[#8a8073]">Chưa có bài tập nào được giao cho lớp này.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {homeworksOfClass(cls.id).slice(0, 3).map((hw) => {
                        const p = deadlineProgress(hw.deadline);
                        return (
                          <div
                            key={hw.id}
                            className="p-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl hover:border-[#193a2b]/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-[#191919] truncate max-w-[65%]" title={hw.title}>
                                {hw.title}
                              </span>
                              <span
                                className={`text-[10px] font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full border ${
                                  p.overdue
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : p.daysLeft <= 3
                                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <Clock size={10} /> {p.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#8a8073] mb-1">
                              <span>{hw.problemCount} bài toán</span>
                              <span>{hw.submittedStudents}/{members.length} đã nộp</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#e5dac9] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  p.overdue ? 'bg-[#cc5a37]' : p.daysLeft <= 3 ? 'bg-yellow-500' : 'bg-[#193a2b]'
                                }`}
                                style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {homeworksOfClass(cls.id).length > 3 && (
                        <Link
                          to="/instructor/homework"
                          className="block text-center text-[11px] text-[#8a8073] hover:text-[#193a2b] font-medium py-1 hover:underline"
                        >
                          +{homeworksOfClass(cls.id).length - 3} bài tập khác &bull; Xem tất cả
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/instructor/class/${cls.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors shadow-sm"
                  >
                    Chi tiết lớp &rarr;
                  </Link>
                  <button
                    onClick={() => openHwModal(cls.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#f0ebd9] text-[#191919] text-xs font-semibold rounded-lg hover:bg-[#e5dac9] transition-colors"
                  >
                    <Plus size={13} /> Giao bài
                  </button>
                  {confirmDelete === cls.id ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] text-red-600 font-medium">Xoá lớp?</span>
                      <button
                        onClick={() => { deleteClass(cls.id); setConfirmDelete(null); }}
                        className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                      >
                        Xoá
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2.5 py-1.5 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(cls.id)}
                      className="ml-auto p-2 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xoá lớp"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== create modal ===== */}
      {showCreate && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)]">
              <h3 className="font-bold font-serif text-[16px]">Tạo lớp học mới</h3>
              <button onClick={() => setShowCreate(false)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Tên lớp *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Cấu trúc dữ liệu & Giải thuật"
                  className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Học kỳ</label>
                <select
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                >
                  <option>Học kỳ 1 - 2024/2025</option>
                  <option>Học kỳ 2 - 2024/2025</option>
                  <option>Học kỳ hè - 2024/2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Giới thiệu ngắn về nội dung môn học…"
                  className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                />
              </div>
              {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
              <p className="text-[11.5px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                💡 Mã lớp (VD: INT4821) và link mời sẽ được tạo tự động — bạn chỉ cần chia sẻ cho sinh viên.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={handleCreate} disabled={isCreatingClass} className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md disabled:opacity-50 flex justify-center items-center gap-2">
                  {isCreatingClass && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Tạo lớp
                </button>
                <button onClick={() => setShowCreate(false)} disabled={isCreatingClass} className="px-6 py-2.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-muted)] font-medium rounded-xl hover:bg-[var(--ws-hover)] disabled:opacity-50">
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== roster modal ===== */}
      {rosterClass && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setRosterId(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)]">
              <div>
                <h3 className="font-bold font-serif text-[16px]">Danh sách sinh viên — {rosterClass.name}</h3>
                <p className="text-xs text-[var(--ws-muted)] mt-0.5">{roster.length} thành viên • mã lớp {rosterClass.code}</p>
              </div>
              <button onClick={() => { setRosterId(null); setConfirmKickId(null); }} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-70px)]">
              {roster.length === 0 ? (
                <p className="p-10 text-center text-sm text-[var(--ws-muted)]">Chưa có sinh viên nào tham gia. Hãy gửi link mời!</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--ws-border)] bg-[var(--ws-hover)]">
                      <th className="text-left text-xs font-semibold text-[var(--ws-muted)] py-3 px-5 uppercase tracking-wider">Sinh viên</th>
                      <th className="text-right text-xs font-semibold text-[var(--ws-muted)] py-3 px-4 uppercase tracking-wider">Bài đã giải</th>
                      <th className="text-right text-xs font-semibold text-[var(--ws-muted)] py-3 px-4 uppercase tracking-wider">Rating</th>
                      <th className="text-right text-xs font-semibold text-[var(--ws-muted)] py-3 px-5 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((m) => (
                      <tr key={m.username} className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-hover)] transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--ws-text)]">{m.fullName}</p>
                              <p className="text-xs text-[var(--ws-muted)]">@{m.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-700">{m.solvedCount ?? '—'}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-[#193a2b]">{m.rating ?? '—'}</td>
                        <td className="py-3 px-5 text-right">
                          {confirmKickId === m.id ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[11px] text-red-600 font-medium">Xoá?</span>
                              <button
                                onClick={async () => { await removeMember(rosterClass.id, m.username); setConfirmKickId(null); }}
                                className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                              >Xoá</button>
                              <button
                                onClick={() => setConfirmKickId(null)}
                                className="px-2 py-1 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                              >Huỷ</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmKickId(m.id)}
                              className="p-1.5 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Gỡ khỏi lớp"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== create homework modal ===== */}
      {hwClass && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[85] flex items-center justify-center p-4" onClick={() => setHwClassId(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)] sticky top-0 bg-[var(--ws-panel)] z-10">
              <div>
                <h3 className="font-bold font-serif text-[16px]">Giao bài tập</h3>
                <p className="text-xs text-[var(--ws-muted)] mt-0.5 flex items-center gap-1">
                  <GraduationCap size={12} /> {hwClass.name} ({hwClass.code}) • {membersOf(hwClass.id).length} SV
                </p>
              </div>
              <button onClick={() => setHwClassId(null)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Tiêu đề *</label>
                <input value={hwForm.title} onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })} placeholder="VD: Bài tập 3 - Đồ thị" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Hạn nộp *</label>
                <input type="datetime-local" value={hwForm.deadline} onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })} className="w-full px-3 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">Mô tả</label>
                <textarea value={hwForm.description} onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })} rows={2} placeholder="Nội dung, yêu cầu của bài tập…" className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none" />
              </div>

              {/* Problem manager */}
              <ProblemManager problems={hwProblems} onChange={setHwProblems} />

              {hwError && <p className="text-xs text-red-600 font-medium">{hwError}</p>}
              <p className="text-[11.5px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                🔒 Chỉ {membersOf(hwClass.id).length} sinh viên trong lớp này mới nhìn thấy bài tập.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={saveHomework} disabled={isSavingHw} className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSavingHw && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Giao bài
                </button>
                <button onClick={() => setHwClassId(null)} disabled={isSavingHw} className="px-6 py-2.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-muted)] font-medium rounded-xl hover:bg-[var(--ws-hover)] disabled:opacity-50">Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
