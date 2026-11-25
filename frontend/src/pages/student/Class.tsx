import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useClass, type ClassInfo } from '../../context/ClassContext';
import { useHomework, deadlineProgress } from '../../context/HomeworkContext';
import { formatVNFull } from '../../utils/dateTime';
import { useContestsQuery } from '../../api/contests';
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
  Lock,
  Globe,
} from 'lucide-react';

export default function ClassPage() {
  const { t } = useTranslation();
  const { allClasses, enrolledClasses, membersOf, joinByCode, joinDirectly, leaveClass, isEnrolled } = useClass();
  const { homeworksOfClass, problemsOf } = useHomework();
  const { data: contestsData } = useContestsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [tab, setTab] = useState<'my' | 'explore'>('my');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedHw, setSelectedHw] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const [privateJoinModal, setPrivateJoinModal] = useState<ClassInfo | null>(null);
  const [privateCodeInput, setPrivateCodeInput] = useState('');
  const [privateJoinError, setPrivateJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  /* banner khi vừa join qua link /join/CODE */
  useEffect(() => {
    const flag = sessionStorage.getItem('jh-joined');
    if (flag) {
      const cls = allClasses.find((c) => c.id === flag);
      if (cls) setJoinMsg({ ok: true, text: t('studentClass.joinedSuccess', { name: cls.name }) });
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
  const selectedClassContests = (contestsData ?? []).filter((c) => c.classId === selectedClass);
  const hwDetail = selectedHw
    ? selectedClassHws.find((h) => h.id === selectedHw)
    : null;

  const discoverable = allClasses.filter(
    (c) =>
      !isEnrolled(c.id) &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.instructorName || c.instructor).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoin = async (code: string) => {
    const res = await joinByCode(code);
    setJoinMsg({ ok: res.ok, text: res.message });
    if (res.ok) setCodeInput('');
    setTimeout(() => setJoinMsg(null), 4000);
  };

  const handleJoinClassItem = async (cls: ClassInfo) => {
    if (cls.is_public) {
      setIsJoining(true);
      const res = await joinDirectly(cls.id);
      setIsJoining(false);
      setJoinMsg({ ok: res.ok, text: res.message });
      setTimeout(() => setJoinMsg(null), 4000);
    } else {
      setPrivateCodeInput('');
      setPrivateJoinError('');
      setPrivateJoinModal(cls);
    }
  };

  const submitPrivateJoin = async () => {
    if (!privateJoinModal || !privateCodeInput.trim()) return;
    setIsJoining(true);
    setPrivateJoinError('');
    const res = await joinDirectly(privateJoinModal.id, privateCodeInput.trim());
    setIsJoining(false);
    if (res.ok) {
      setJoinMsg({ ok: true, text: res.message });
      setPrivateJoinModal(null);
      setPrivateCodeInput('');
      setTimeout(() => setJoinMsg(null), 4000);
    } else {
      // Hiển thị lỗi ngay trên cửa sổ nhập mã (vd. MSSV không có trong danh sách lớp)
      setPrivateJoinError(res.message);
    }
  };

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* header + join by code */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.class')}</h2>
          <p className="text-sm text-(--ws-muted) mt-1">
            {t('studentClass.subtitle', { count: enrolledClasses.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-56">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && codeInput.trim() && handleJoin(codeInput)}
              placeholder={t('studentClass.codeInputPlaceholder')}
              className="w-full pl-9 pr-3 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-[13px] font-mono text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
            />
          </div>
          <button
            onClick={() => codeInput.trim() && handleJoin(codeInput)}
            disabled={!codeInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus size={15} /> {t('studentClass.joinBtn')}
          </button>
        </div>
      </div>

      {/* join toast */}
      {joinMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium animate-slide-up ${
            joinMsg.ok
              ? 'bg-(--ws-ok-soft) border-(--ws-ok)/35 text-(--ws-ok)'
              : 'bg-(--ws-danger-soft) border-(--ws-danger)/35 text-(--ws-danger)'
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
            tab === 'my' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm' : 'bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
          }`}
        >
          {t('studentClass.tabMy', { count: enrolledClasses.length })}
        </button>
        <button
          onClick={() => setTab('explore')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'explore' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm' : 'bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
          }`}
        >
          {t('studentClass.tabExplore')}
        </button>
      </div>

      {/* ===== MY CLASSES ===== */}
      {tab === 'my' && (
        <>
          {enrolledClasses.length === 0 ? (
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-14 text-center shadow-sm">
              <GraduationCap size={48} className="text-(--ws-faint) mx-auto mb-4" />
              <p className="font-semibold text-(--ws-text)">{t('studentClass.emptyMyTitle')}</p>
              <p className="text-sm text-(--ws-muted) mt-1">{t('studentClass.emptyMySubtitle')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledClasses.map((cls) => (
                <div key={cls.id} className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 hover:shadow-md hover:border-(--ws-accent)/30 transition-all shadow-sm flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap size={24} className="text-(--ws-on-accent)" />
                    </div>
                    {leaveConfirmId === cls.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-(--ws-danger) font-medium">{t('studentClass.leaveClassQuestion')}</span>
                        <button
                          onClick={async () => { await leaveClass(cls.id); setLeaveConfirmId(null); }}
                          className="px-2 py-1 bg-(--ws-danger) text-(--ws-on-accent) text-xs font-semibold rounded-lg hover:bg-(--ws-danger)"
                        >{t('studentClass.confirmShort')}</button>
                        <button
                          onClick={() => setLeaveConfirmId(null)}
                          className="px-2 py-1 bg-(--ws-panel2) text-(--ws-text) text-xs font-semibold rounded-lg hover:bg-(--ws-hover)"
                        >{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLeaveConfirmId(cls.id); }}
                        className="flex items-center gap-1 text-[11px] text-(--ws-muted) hover:text-(--ws-danger) opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('studentClass.leaveClass')}
                      >
                        <LogOut size={12} /> {t('studentClass.leaveClass')}
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold font-serif text-(--ws-text) mb-1">{cls.subject ? `${cls.subject} - ${cls.name}` : cls.name}</h3>
                  {cls.semester && <p className="text-sm text-(--ws-muted) mb-1">{cls.semester}</p>}
                  <p className="text-xs text-(--ws-muted) mb-4">{t('studentClass.instructorPrefix')}: {cls.instructorName || cls.instructor}</p>
                  <div className="flex items-center gap-4 text-sm text-(--ws-muted) mt-auto mb-4">
                    <span className="flex items-center gap-1"><Users size={14} /> {membersOf(cls.id).length}</span>
                  </div>
                  {/* CTA → ClassDetail */}
                  <Link
                    to={`/student/class/${cls.id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                  >
                    <ChevronRight size={14} /> {t('studentClass.viewHomeworkBtn')}
                  </Link>
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('studentClass.exploreSearchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
            />
          </div>

          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl overflow-hidden shadow-sm">
            {discoverable.map((cls) => (
              <div key={cls.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-(--ws-hover)/70 transition-colors">
                <div className="w-10 h-10 bg-(--ws-panel2) rounded-lg flex items-center justify-center shrink-0">
                  <GraduationCap size={20} className="text-(--ws-accent)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-(--ws-text)">{cls.subject ? `${cls.subject} - ${cls.name}` : cls.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      cls.is_public
                        ? 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35'
                        : 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)'
                    }`}>
                      {cls.is_public ? <Globe size={11} /> : <Lock size={11} />}
                      {cls.is_public ? 'Công khai' : 'Riêng tư'}
                    </span>
                  </div>
                  {cls.semester && <p className="text-xs text-(--ws-muted) mt-0.5">{cls.semester}</p>}
                  <p className="text-xs text-(--ws-muted) mt-0.5">
                    {t('studentClass.instructorPrefix')}: {cls.instructorName || cls.instructor} • {t('instructorClass.memberCountSuffix', { count: membersOf(cls.id).length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleJoinClassItem(cls)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                      cls.is_public
                        ? 'bg-(--ws-accent) text-(--ws-on-accent) hover:bg-(--ws-accent-strong)'
                        : 'bg-(--ws-text) text-(--ws-panel) hover:bg-(--ws-muted)'
                    }`}
                  >
                    {cls.is_public ? <UserPlus size={13} /> : <Lock size={13} />}
                    {cls.is_public ? t('studentClass.joinBtn') : 'Nhập mã vào lớp'}
                  </button>
                </div>
              </div>
            ))}
            {discoverable.length === 0 && (
              <p className="p-10 text-center text-sm text-(--ws-muted)">{t('studentClass.exploreEmpty')}</p>
            )}
          </div>
        </div>
      )}

      {/* ===== detail modal ===== */}
      {selectedClass && selectedClassData && !hwDetail && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setSelectedClass(null)}>
          <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <div>
                <h3 className="text-lg font-bold font-serif text-(--ws-text)">{selectedClassData.subject ? `${selectedClassData.subject} - ${selectedClassData.name}` : selectedClassData.name}</h3>
                {selectedClassData.semester && <p className="text-sm text-(--ws-muted) mt-1">{selectedClassData.semester}</p>}
              </div>
              <button aria-label={t('common.close')} onClick={() => setSelectedClass(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <p className="text-sm text-(--ws-text) mb-6 leading-relaxed">{selectedClassData.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <Users size={20} className="text-(--ws-info) mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{membersOf(selectedClassData.id).length}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('breadcrumb.students')}</p>
                </div>
                <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <BookOpen size={20} className="text-(--ws-ok) mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{selectedClassData.homeworkCount}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('nav.problems')}</p>
                </div>
                <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <Trophy size={20} className="text-(--ws-warn) mx-auto mb-2" />
                  <p className="text-lg font-bold font-serif">{selectedClassData.contestCount}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('nav.contest')}</p>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-2 text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                  <User size={14} /> {t('breadcrumb.instructor')}
                </div>
                <p className="text-sm text-(--ws-text) font-semibold">{selectedClassData.instructorName || selectedClassData.instructor}</p>
              </div>

              {selectedClassHws.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold font-serif text-(--ws-text) flex items-center gap-1.5">
                      <ClipboardList size={15} /> {t('studentClass.homeworkCountHeading', { count: selectedClassHws.length })}
                    </h4>
                    <Link
                      to={`/student/class/${selectedClassData?.id}`}
                      onClick={() => setSelectedClass(null)}
                      className="text-xs text-(--ws-accent) font-semibold hover:underline flex items-center gap-1"
                    >
                      {t('studentClass.viewAll')} <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="space-y-2.5">
                    {selectedClassHws.map((hw) => {
                      const p = deadlineProgress(hw.deadline, hw.createdAt);
                      return (
                        <button
                          key={hw.id}
                          onClick={() => setSelectedHw(hw.id)}
                          className="w-full text-left p-3.5 bg-(--ws-panel) rounded-xl border border-(--ws-border) hover:bg-(--ws-hover) transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-(--ws-text) font-semibold truncate">{hw.title}</p>
                            <span className="flex items-center gap-1 shrink-0">
                              <span className={`text-[11px] font-semibold ${p.overdue ? 'text-(--ws-danger)' : p.daysLeft <= 3 ? 'text-(--ws-warn)' : 'text-(--ws-ok)'}`}>
                                {p.label}
                              </span>
                              <ChevronRight size={14} className="text-(--ws-muted)" />
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-(--ws-muted) mb-1.5">
                            <span className="flex items-center gap-1"><Clock size={11} /> {formatVNFull(hw.deadline)}</span>
                            <span className="flex items-center gap-1"><BookOpen size={11} /> {t('studentClass.problemCount', { count: hw.problemCount })}</span>
                          </div>
                          <div className="w-full h-1.5 bg-(--ws-panel2) rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.overdue ? 'bg-(--ws-danger)' : p.daysLeft <= 3 ? 'bg-(--ws-warn)' : 'bg-(--ws-accent)'}`}
                              style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedClassContests.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3">{t('nav.contest')}</h4>
                  <div className="space-y-2">
                    {selectedClassContests.map((contest) => (
                      <div key={contest.id} className="flex items-center justify-between p-3 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                        <div>
                          <p className="text-sm text-(--ws-text) font-semibold">{contest.title}</p>
                          <p className="text-xs text-(--ws-muted) flex items-center gap-1 mt-1"><Calendar size={12} /> {contest.startTime}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          contest.status === 'running' ? 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35' :
                          contest.status === 'upcoming' ? 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35' :
                          'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)'
                        }`}>
                          {contest.status === 'running' ? t('instructorContest.statusRunning') : contest.status === 'upcoming' ? t('instructorContest.statusUpcoming') : t('instructorContest.statusEnded')}
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
                        className="flex-1 py-2.5 bg-(--ws-danger) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-danger) transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut size={15} /> {t('studentClass.confirmLeaveClass')}
                      </button>
                      <button
                        onClick={() => setLeaveConfirmId(null)}
                        className="px-5 py-2.5 bg-(--ws-panel2) text-(--ws-text) border border-(--ws-border) font-medium rounded-xl hover:bg-(--ws-hover)"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setLeaveConfirmId(`modal-${selectedClassData.id}`)}
                      className="w-full py-2.5 bg-(--ws-danger-soft) text-(--ws-danger) border border-(--ws-danger)/35 font-medium rounded-xl hover:bg-(--ws-danger-soft) transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut size={15} /> {t('studentClass.leaveClass')}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => {
                      setSelectedClass(null);
                      handleJoinClassItem(selectedClassData);
                    }}
                    className="w-full py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md flex items-center justify-center gap-2"
                  >
                    {selectedClassData.is_public ? <UserPlus size={16} /> : <Lock size={16} />}
                    {selectedClassData.is_public ? 'Tham gia lớp công khai này' : 'Nhập mã để tham gia lớp riêng tư này'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== private class code input modal ===== */}
      {privateJoinModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-95 flex items-center justify-center p-4" onClick={() => setPrivateJoinModal(null)}>
          <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-(--ws-border) mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-(--ws-warn-soft) text-(--ws-warn) flex items-center justify-center font-bold">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-(--ws-text) wrap-break-word">{privateJoinModal.subject ? `${privateJoinModal.subject} - ${privateJoinModal.name}` : privateJoinModal.name}</h3>
                  <p className="text-xs text-(--ws-muted)">Lớp học riêng tư (Private)</p>
                </div>
              </div>
              <button aria-label={t('common.close')} onClick={() => setPrivateJoinModal(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>

            <p className="text-xs text-(--ws-text) leading-relaxed mb-4">
              Lớp học này yêu cầu <strong>Mã mời (Enrollment Code)</strong> do giảng viên cung cấp để tham gia. Vui lòng nhập mã bên dưới:
            </p>

            <div className="relative mb-4">
              <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
              <input
                autoFocus
                value={privateCodeInput}
                onChange={(e) => { setPrivateCodeInput(e.target.value); setPrivateJoinError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && privateCodeInput.trim() && submitPrivateJoin()}
                placeholder="Nhập mã mời lớp học (VD: INT4821)"
                className="w-full pl-9 pr-3 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-sm font-mono text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
              />
            </div>

            {privateJoinError && (
              <p className="text-xs font-medium text-(--ws-danger) bg-(--ws-danger-soft) border border-(--ws-danger)/35 rounded-lg px-3 py-2 mb-4">
                {privateJoinError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPrivateJoinModal(null)}
                className="px-4 py-2 bg-(--ws-panel2) text-(--ws-text) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitPrivateJoin}
                disabled={!privateCodeInput.trim() || isJoining}
                className="flex items-center gap-1.5 px-5 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-40 transition-colors"
              >
                {isJoining && <span className="w-3 h-3 border-2 border-(--ws-panel)/30 border-t-white rounded-full animate-spin" />}
                {t('studentClass.joinBtn')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== homework detail modal (deadline + đề bài) ===== */}
      {hwDetail && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-95 flex items-center justify-center p-4" onClick={() => setSelectedHw(null)}>
          <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 bg-(--ws-panel2) z-10">
              <h3 className="font-bold font-serif text-[16px] text-(--ws-text)">{hwDetail.title}</h3>
              <button aria-label={t('common.close')} onClick={() => setSelectedHw(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* deadline tracking */}
              {(() => {
                const p = deadlineProgress(hwDetail.deadline, hwDetail.createdAt);
                return (
                  <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5 text-(--ws-muted)"><Clock size={13} /> {t('studentContest.deadlineLabel')}: <span className="font-medium text-(--ws-text)">{formatVNFull(hwDetail.deadline)}</span></span>
                      <span className={`font-semibold ${p.overdue ? 'text-(--ws-danger)' : p.daysLeft <= 3 ? 'text-(--ws-warn)' : 'text-(--ws-ok)'}`}>{p.label}</span>
                    </div>
                    <div className="w-full h-2 bg-(--ws-panel2) rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.overdue ? 'bg-(--ws-danger)' : p.daysLeft <= 3 ? 'bg-linear-to-r from-(--ws-warn) to-(--ws-danger)' : 'bg-linear-to-r from-(--ws-accent) to-(--ws-ok)'}`}
                        style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {hwDetail.description && <p className="text-sm text-(--ws-text) leading-relaxed">{hwDetail.description}</p>}

              {/* problem list with expandable statements */}
              <div>
                <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-2">{t('studentHomework.problemListTitle')}</h4>
                <div className="space-y-2">
                  {problemsOf(hwDetail.id).map((p, i) => {
                    const open = expandedProblem === p.id;
                    const dc: Record<string, string> = {
                      Easy: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
                      Medium: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
                      Hard: 'bg-(--ws-danger-soft) text-(--ws-danger) border-(--ws-danger)/35',
                    };
                    const dl: Record<string, string> = {
                      Easy: t('instructorHomework.difficultyEasy'),
                      Medium: t('instructorHomework.difficultyMedium'),
                      Hard: t('instructorHomework.difficultyHard'),
                    };
                    return (
                      <div key={p.id} className="bg-(--ws-panel) rounded-xl border border-(--ws-border) overflow-hidden">
                        <button onClick={() => setExpandedProblem(open ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-(--ws-hover) transition-colors">
                          <span className="text-xs text-(--ws-muted) font-mono w-5">{i + 1}.</span>
                          <span className="flex-1 text-sm font-medium text-(--ws-text) truncate">{p.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${dc[p.difficulty]}`}>{dl[p.difficulty]}</span>
                          <span className="text-[11px] text-(--ws-muted) w-9 text-right">{t('studentContest.pointsShort', { count: p.points })}</span>
                          {p.problem_id ? (
                            <Link
                              to={`/student/problem/${p.problem_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-(--ws-accent) text-(--ws-on-accent) text-[11px] font-semibold rounded-lg hover:bg-(--ws-accent-strong) transition-colors shrink-0"
                              title={t('studentClass.solveAndSubmitTooltip')}
                            >
                              <Play size={11} /> {t('studentContest.solveTask')}
                            </Link>
                          ) : (
                            <ChevronRight size={14} className={`text-(--ws-muted) transition-transform ${open ? 'rotate-90' : ''} shrink-0`} />
                          )}
                        </button>
                        {open && (
                          <div className="px-4 pb-4 pt-1 border-t border-(--ws-border)/60 animate-fade-in">
                            <p className="text-[13px] text-(--ws-text) leading-6 whitespace-pre-wrap font-mono">{p.statement}</p>
                            {(p.sampleInput || p.sampleOutput) && (
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="rounded-lg border border-(--ws-border) overflow-hidden">
                                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ws-muted) bg-(--ws-panel2)">{t('studentHomework.sampleInput')}</p>
                                  <pre className="px-3 py-2 text-[12.5px] font-mono whitespace-pre-wrap text-(--ws-text)">{p.sampleInput || '—'}</pre>
                                </div>
                                <div className="rounded-lg border border-(--ws-border) overflow-hidden">
                                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ws-muted) bg-(--ws-panel2)">{t('studentHomework.sampleOutput')}</p>
                                  <pre className="px-3 py-2 text-[12.5px] font-mono whitespace-pre-wrap text-(--ws-text)">{p.sampleOutput || '—'}</pre>
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