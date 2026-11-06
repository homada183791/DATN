import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClass, Member } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
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
  UserMinus,
  Calendar,
  ClipboardList,
} from 'lucide-react';

// Computes a sensible "current" semester label (e.g. "Học kỳ 1 - 2026/2027")
// so the create-class form doesn't default to a permanently stale year.
function getDefaultSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  if (month >= 9) return `Học kỳ 1 - ${year}/${year + 1}`;
  if (month === 1) return `Học kỳ 1 - ${year - 1}/${year}`;
  if (month >= 2 && month <= 6) return `Học kỳ 2 - ${year - 1}/${year}`;
  return `Học kỳ 3 - ${year - 1}/${year}`;
}

// Builds a handful of ready-made suggestions (current + previous academic year)
// offered via <datalist> while still letting the instructor type anything.
function buildSemesterSuggestions(): string[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const academicStartYear = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const suggestions: string[] = [];
  [academicStartYear - 1, academicStartYear].forEach((y) => {
    suggestions.push(`Học kỳ 1 - ${y}/${y + 1}`);
    suggestions.push(`Học kỳ 2 - ${y}/${y + 1}`);
    suggestions.push(`Học kỳ 3 - ${y}/${y + 1}`);
  });
  return suggestions;
}

export default function InstructorClass() {
  const { t } = useTranslation();
  const { myClasses, createClass, deleteClass, membersOf, removeMember } = useClass();
  const { homeworksOfClass, refetch } = useHomework();
  const semesterSuggestions = buildSemesterSuggestions();

  useEffect(() => {
    refetch();
  }, [refetch]);
  const [showCreate, setShowCreate] = useState(false);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);


  const [form, setForm] = useState({ name: '', semester: getDefaultSemester(), description: '', is_public: false });
  const [formError, setFormError] = useState('');

  const hasDocument = typeof document !== 'undefined';

  const rosterClass = myClasses.find((c) => c.id === rosterId);
  const roster: Member[] = rosterClass ? membersOf(rosterClass.id) : [];

  const totalStudents = myClasses.reduce((sum, c) => sum + membersOf(c.id).length, 0);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const getCleanCode = (code?: string) => {
    if (!code) return 'CODE';
    return code.length > 10 ? `JH-${code.slice(0, 6).toUpperCase()}` : code.toUpperCase();
  };

  const inviteLink = (code: string) => `${window.location.origin}/join/${code}`;

  const handleCreate = async () => {
    if (form.name.trim().length < 3) {
      setFormError(t('instructorClass.errors.nameTooShort'));
      return;
    }
    setIsCreatingClass(true);
    setFormError('');
    try {
      await createClass({
        name: form.name.trim(),
        semester: form.semester.trim(),
        description: form.description.trim(),
        is_public: form.is_public,
      });
      setForm({ name: '', semester: getDefaultSemester(), description: '', is_public: false });
      setShowCreate(false);
    } catch (e: any) {
      setFormError(e.message || t('instructorClass.errors.createClassFailed'));
    } finally {
      setIsCreatingClass(false);
    }
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('instructorClass.pageTitle')}</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {t('instructorClass.pageSubtitle', { count: myClasses.length })}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
        >
          <Plus size={18} /> {t('instructorClass.createNew')}
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <GraduationCap size={20} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myClasses.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorClass.statManaging')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <Users size={20} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{totalStudents}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorClass.statTotalStudents')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <BookOpen size={20} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myClasses.reduce((s, c) => s + homeworksOfClass(c.id).length, 0)}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorClass.statAssigned')}</p>
        </div>
      </div>

      {/* class cards */}
      {myClasses.length === 0 ? (
        <div className="bg-white border border-[#e5dac9] rounded-xl p-14 text-center shadow-sm">
          <GraduationCap size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="font-semibold text-[#191919]">{t('instructorClass.emptyTitle')}</p>
          <p className="text-sm text-[#8a8073] mt-1 mb-5">{t('instructorClass.emptySubtitle')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md"
          >
            <Plus size={16} /> {t('instructorClass.createNew')}
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
                    <div className="w-12 h-12 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-xl flex items-center justify-center shadow-md">
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-1 rounded-md bg-[#f0ebd9] border border-[#e5dac9] text-[#193a2b]">
                      <Hash size={11} /> {cls.code}
                    </span>
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                      cls.is_public
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#f7f4eb] text-[#8a8073] border-[#e5dac9]'
                    }`}>
                      {cls.is_public ? '🌐 Công khai' : '🔒 Riêng tư'}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[#5c5446] mb-4 leading-relaxed flex-1">
                  {cls.description || t('instructorClass.noDescription')}
                </p>

                <div className="flex items-center gap-4 text-sm text-[#8a8073] mb-4">
                  <span className="flex items-center gap-1"><Users size={14} /> {members.length}</span>
                  <span className="flex items-center gap-1"><ClipboardList size={14} /> {homeworksOfClass(cls.id).length}</span>
                  <span className="flex items-center gap-1"><Trophy size={14} /> {cls.contestCount}</span>
                </div>

                {/* invite link with standardized rule */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-xl mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-[#193a2b]/10 text-[#193a2b] flex items-center justify-center shrink-0">
                      <Link2 size={13} />
                    </div>
                    <span className="text-[11.5px] font-mono font-medium text-[#191919] truncate">
                      judgehub.edu.vn/join/<span className="font-bold text-[#193a2b]">{getCleanCode(cls.code)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copy(inviteLink(cls.code), `link-${cls.id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#193a2b] bg-[#e5dac9]/60 hover:bg-[#e5dac9] rounded-lg transition-colors"
                      title={t('instructorClass.copyFullInviteLink')}
                    >
                      {copied === `link-${cls.id}` ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                      <span>{copied === `link-${cls.id}` ? t('instructorClass.copiedLabel') : t('instructorClass.copyLinkLabel')}</span>
                    </button>
                    <button
                      onClick={() => copy(cls.code, `code-${cls.id}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#5c5446] hover:text-[#193a2b] hover:bg-[#e5dac9]/60 rounded-lg transition-colors"
                      title={t('instructorClass.copyClassCode')}
                    >
                      {copied === `code-${cls.id}` ? <Check size={12} className="text-emerald-700" /> : <Hash size={12} />}
                      <span>{t('instructorClass.codeAbbr')}</span>
                    </button>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/instructor/class/${cls.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193a2b] text-white text-xs font-semibold rounded-lg hover:bg-[#143022] transition-colors shadow-sm"
                  >
                    {t('instructorClass.classDetailsLink')} &rarr;
                  </Link>
                  {confirmDelete === cls.id ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] text-red-600 font-medium">{t('instructorClass.confirmDeleteQuestion')}</span>
                      <button
                        onClick={() => { deleteClass(cls.id); setConfirmDelete(null); }}
                        className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2.5 py-1.5 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(cls.id)}
                      className="ml-auto p-2 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('instructorClass.deleteClass')}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 z-10 bg-(--ws-panel)">
              <h3 className="font-bold font-serif text-[16px]">{t('instructorClass.modalCreateTitle')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldClassName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('instructorClass.fieldClassNamePlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldSemester')}</label>
                <input
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  placeholder={t('instructorClass.fieldSemesterPlaceholder')}
                  list="semester-suggestions-create"
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                />
                <datalist id="semester-suggestions-create">
                  {semesterSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder={t('instructorClass.fieldDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">Hình thức tham gia lớp</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_public: false })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !form.is_public
                        ? 'border-[#193a2b] bg-[#193a2b]/5 ring-1 ring-[#193a2b]'
                        : 'border-(--ws-border) bg-(--ws-editor) hover:border-(--ws-accent)'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-(--ws-text) mb-1">
                      <span>🔒 Riêng tư</span>
                      {!form.is_public && <span className="text-[10px] bg-[#193a2b] text-white px-1.5 py-0.5 rounded font-mono">Mặc định</span>}
                    </div>
                    <p className="text-[11px] text-(--ws-muted) leading-relaxed">
                      Yêu cầu mã mời / link mời hoặc giảng viên thêm trực tiếp vào danh sách.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_public: true })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.is_public
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-(--ws-border) bg-(--ws-editor) hover:border-(--ws-accent)'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-emerald-800 mb-1">
                      <span>🌐 Công khai</span>
                      {form.is_public && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">Đã chọn</span>}
                    </div>
                    <p className="text-[11px] text-(--ws-muted) leading-relaxed">
                      Bất kỳ sinh viên nào cũng có thể tự do tham gia ngay tại trang khám phá.
                    </p>
                  </button>
                </div>
              </div>
              {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
              <p className="text-[11.5px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                💡 {t('instructorClass.createHint')}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={isCreatingClass}
                  className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreatingClass}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isCreatingClass && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('instructorClass.createSubmit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== roster modal ===== */}
      {rosterClass && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setRosterId(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border)">
              <div>
                <h3 className="font-bold font-serif text-[16px]">{t('instructorClass.rosterTitle', { name: rosterClass.name })}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorClass.rosterSubtitle', { count: roster.length, code: rosterClass.code })}</p>
              </div>
              <button onClick={() => { setRosterId(null); setConfirmKickId(null); }} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-70px)]">
              {roster.length === 0 ? (
                <p className="p-10 text-center text-sm text-(--ws-muted)">{t('instructorClass.rosterEmpty')}</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-(--ws-border) bg-(--ws-hover)">
                      <th className="text-left text-xs font-semibold text-(--ws-muted) py-3 px-5 uppercase tracking-wider">{t('instructorClass.colStudent')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-3 px-4 uppercase tracking-wider">{t('instructorClass.colSolved')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-3 px-4 uppercase tracking-wider">Rating</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-3 px-5 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((m) => (
                      <tr key={m.username} className="border-b border-(--ws-border) hover:bg-(--ws-hover) transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-linear-to-br from-[#193a2b] to-[#2d5a3f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-(--ws-text)">{m.fullName}</p>
                              <p className="text-xs text-(--ws-muted)">@{m.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-700">{m.solvedCount ?? '—'}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-[#193a2b]">{m.rating ?? '—'}</td>
                        <td className="py-3 px-5 text-right">
                          {confirmKickId === m.id ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[11px] text-red-600 font-medium">{t('instructorClass.confirmRemoveQuestion')}</span>
                              <button
                                onClick={async () => { await removeMember(rosterClass.id, m.username); setConfirmKickId(null); }}
                                className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500"
                              >{t('common.delete')}</button>
                              <button
                                onClick={() => setConfirmKickId(null)}
                                className="px-2 py-1 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]"
                              >{t('common.cancel')}</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmKickId(m.id)}
                              className="p-1.5 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('instructorClass.removeFromClass')}
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

    </div>
  );
}
