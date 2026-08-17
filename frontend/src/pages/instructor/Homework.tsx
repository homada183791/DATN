import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClass } from '../../context/ClassContext';
import { useHomework, deadlineProgress, HomeworkInput, HomeworkProblem } from '../../context/HomeworkContext';
import { Homework } from '../../data/mockData';
import ProblemManager from '../../components/ProblemManager';
import {
  ClipboardList,
  Plus,
  X,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';

type EditorState = { mode: 'create' | 'edit'; hw?: Homework } | null;

const emptyForm = { title: '', description: '', deadline: '', classId: '' };

export default function InstructorHomework() {
  const { t } = useTranslation();
  const { myClasses, membersOf } = useClass();
  const { allHomeworks, problemsOf, createHomework, updateHomework, deleteHomework } = useHomework();

  const [editor, setEditor] = useState<EditorState>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [form, setForm] = useState(emptyForm);
  const [draftProblems, setDraftProblems] = useState<HomeworkProblem[]>([]);
  const [error, setError] = useState('');
  const hasDocument = typeof document !== 'undefined';

  const myClassIds = useMemo(() => new Set(myClasses.map((c) => c.id)), [myClasses]);
  const myHomeworks = useMemo(
    () => allHomeworks.filter((h) => myClassIds.has(h.classId)),
    [allHomeworks, myClassIds]
  );

  const filtered = classFilter === 'all' ? myHomeworks : myHomeworks.filter((h) => h.classId === classFilter);
  const viewHw = myHomeworks.find((h) => h.id === viewId);

  const activeCount = myHomeworks.filter((h) => h.status === 'active').length;
  const overdueSoon = myHomeworks.filter((h) => {
    const p = deadlineProgress(h.deadline);
    return !p.overdue && p.daysLeft <= 3 && h.status === 'active';
  }).length;

  const openCreate = () => {
    setForm({ ...emptyForm, classId: myClasses[0]?.id ?? '' });
    setDraftProblems([]);
    setError('');
    setEditor({ mode: 'create' });
  };

  const openEdit = (hw: Homework) => {
    setForm({
      title: hw.title,
      description: hw.description,
      deadline: hw.deadline.replace(' ', 'T').slice(0, 16),
      classId: hw.classId,
    });
    setDraftProblems(problemsOf(hw.id));
    setError('');
    setEditor({ mode: 'edit', hw });
  };

  const save = () => {
    if (form.title.trim().length < 3) return setError(t('instructorClass.errors.titleTooShort'));
    if (!form.classId) return setError(t('instructorHomework.errors.classRequired'));
    if (!form.deadline) return setError(t('instructorClass.errors.deadlineRequired'));
    if (draftProblems.length === 0) return setError(t('instructorClass.errors.problemsRequired'));
    const cls = myClasses.find((c) => c.id === form.classId)!;
    const deadline = form.deadline.replace('T', ' ');
    const payload: HomeworkInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      deadline,
      problems: draftProblems,
      classId: form.classId,
      className: `${cls.name} - ${cls.code}`,
      totalStudents: membersOf(form.classId).length,
    };
    if (editor?.mode === 'edit' && editor.hw) {
      updateHomework(editor.hw.id, payload);
    } else {
      createHomework(payload);
    }
    setEditor(null);
  };

  const statusChip: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    closed: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
  };
  const statusLabel: Record<string, string> = {
    active: t('instructorHomework.statusActive'),
    upcoming: t('instructorHomework.statusUpcoming'),
    closed: t('instructorHomework.statusClosed'),
  };

  return (
    <div className="space-y-6 text-[#191919]">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('nav.problems')}</h2>
          <p className="text-sm text-[#8a8073] mt-1">
            {t('instructorHomework.subtitle', { count: myClasses.length })}
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={myClasses.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={18} /> {t('instructorHomework.createNew')}
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <ClipboardList size={20} className="text-[#193a2b] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myHomeworks.length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorHomework.statTotal')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{activeCount}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorHomework.statusActive')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <AlertTriangle size={20} className="text-[#cc5a37] mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{overdueSoon}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorHomework.statDueSoon')}</p>
        </div>
      </div>

      {/* class filter */}
      {myClasses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setClassFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              classFilter === 'all' ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white border border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
            }`}
          >
            {t('instructorHomework.filterAllClasses')}
          </button>
          {myClasses.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassFilter(c.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                classFilter === c.id ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white border border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      )}

      {/* list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5dac9] rounded-xl p-14 text-center shadow-sm">
          <ClipboardList size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="font-semibold text-[#191919]">{t('instructorHomework.emptyTitle')}</p>
          <p className="text-sm text-[#8a8073] mt-1 mb-5">
            {myClasses.length === 0 ? t('instructorHomework.emptyNoClass') : t('instructorHomework.emptySubtitle')}
          </p>
          {myClasses.length > 0 && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md">
              <Plus size={16} /> {t('instructorHomework.createNew')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((hw) => {
            const p = deadlineProgress(hw.deadline);
            const submitPct = hw.totalStudents ? Math.round((hw.submittedStudents / hw.totalStudents) * 100) : 0;
            return (
              <div key={hw.id} className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md transition-all shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold font-serif text-[#191919]">{hw.title}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip[hw.status]}`}>
                        {statusLabel[hw.status]}
                      </span>
                    </div>
                    <p className="text-sm text-[#5c5446] mb-3 leading-relaxed line-clamp-2">{hw.description || t('instructorClass.noDescription')}</p>
                    <div className="flex items-center gap-4 text-sm text-[#8a8073] flex-wrap">
                      <span className="flex items-center gap-1"><GraduationCap size={14} /> {hw.className}</span>
                      <span className="flex items-center gap-1"><BookOpen size={14} /> {hw.problemCount} {t('instructorHomework.problemsUnit')}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> {hw.submittedStudents}/{hw.totalStudents} {t('instructorDashboard.submittedSuffix')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setViewId(hw.id)} className="p-2 bg-[#f0ebd9] rounded-lg text-[#5c5446] hover:bg-[#e5dac9] transition-colors" title={t('instructorContest.viewDetail')}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openEdit(hw)} className="p-2 bg-[#f0ebd9] rounded-lg text-[#5c5446] hover:bg-[#e5dac9] transition-colors" title={t('common.edit')}>
                      <Edit3 size={16} />
                    </button>
                    {confirmDelete === hw.id ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { deleteHomework(hw.id); setConfirmDelete(null); }} className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500">{t('common.delete')}</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 bg-[#f0ebd9] text-[#5c5446] text-xs font-semibold rounded-lg hover:bg-[#e5dac9]">{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(hw.id)} className="p-2 text-[#8a8073] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common.delete')}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* deadline progress bar */}
                <div className="mt-5 pt-4 border-t border-[#e5dac9]/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 text-[#8a8073]">
                      <Clock size={13} /> {t('instructorHomework.deadlineLabel')}: <span className="font-medium text-[#5c5446]">{hw.deadline}</span>
                    </span>
                    <span className={`font-semibold ${p.overdue ? 'text-[#cc5a37]' : p.daysLeft <= 3 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                      {p.label}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f0ebd9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.overdue ? 'bg-[#cc5a37]' : p.daysLeft <= 3 ? 'bg-gradient-to-r from-yellow-500 to-[#cc5a37]' : 'bg-gradient-to-r from-[#193a2b] to-emerald-500'
                      }`}
                      style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#8a8073] mt-2">
                    <span>{t('instructorHomework.classProgress')}</span>
                    <span className="font-semibold text-[#193a2b]">{submitPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0ebd9] rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${submitPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== editor modal ===== */}
      {editor && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setEditor(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)] sticky top-0 bg-[var(--ws-panel)]">
              <h3 className="font-bold font-serif text-[16px]">{editor.mode === 'edit' ? t('instructorHomework.editTitle') : t('instructorHomework.createNew')}</h3>
              <button onClick={() => setEditor(null)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">{t('instructorClass.fieldTitle')}</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('instructorClass.fieldTitlePlaceholder')} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">{t('instructorHomework.fieldAssignTo')}</label>
                <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                  <option value="">{t('instructorHomework.selectClassOption')}</option>
                  {myClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">{t('instructorClass.fieldDeadline')}</label>
                <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ws-muted)] mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t('instructorClass.fieldHwDescriptionPlaceholder')} className="w-full px-4 py-2.5 bg-[var(--ws-editor)] border border-[var(--ws-border)] rounded-xl text-[var(--ws-text)] placeholder-[var(--ws-faint)] focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none" />
              </div>

              {/* Problem manager */}
              <ProblemManager problems={draftProblems} onChange={setDraftProblems} />

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              <p className="text-[11.5px] text-[#8a8073] bg-[#f0ebd9] border border-[#e5dac9] rounded-lg px-3 py-2">
                🔒 {t('instructorHomework.visibilityHint')}
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={save} className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md">
                  {editor.mode === 'edit' ? t('instructorHomework.saveChanges') : t('instructorClass.assignSubmit')}
                </button>
                <button onClick={() => setEditor(null)} className="px-6 py-2.5 bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-muted)] font-medium rounded-xl hover:bg-[var(--ws-hover)]">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== view modal ===== */}
      {viewHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4" onClick={() => setViewId(null)}>
          <div className="bg-[var(--ws-panel)] border border-[var(--ws-border)] text-[var(--ws-text)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)] sticky top-0 bg-[var(--ws-panel)] z-10">
              <h3 className="font-bold font-serif text-[16px]">{viewHw.title}</h3>
              <button onClick={() => setViewId(null)} className="text-[var(--ws-muted)] hover:text-[var(--ws-text)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip[viewHw.status]}`}>{statusLabel[viewHw.status]}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--ws-panel2)] border border-[var(--ws-border)] text-[var(--ws-muted)] flex items-center gap-1"><GraduationCap size={12} /> {viewHw.className}</span>
              </div>
              <p className="text-sm text-[var(--ws-muted)] leading-relaxed">{viewHw.description || t('instructorClass.noDescription')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center">
                  <p className="text-lg font-bold font-serif">{viewHw.problemCount}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">{t('instructorContest.fieldProblemCount')}</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center">
                  <p className="text-lg font-bold font-serif">{viewHw.submittedStudents}/{viewHw.totalStudents}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">{t('instructorHomework.submittedLabel')}</p>
                </div>
                <div className="p-3 bg-[var(--ws-panel2)] rounded-xl border border-[var(--ws-border)] text-center">
                  <p className="text-lg font-bold font-serif text-[#193a2b]">{deadlineProgress(viewHw.deadline).label}</p>
                  <p className="text-xs text-[var(--ws-muted)] mt-0.5">Deadline</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--ws-muted)]">
                <Calendar size={14} className="text-[var(--ws-muted)]" /> {t('instructorHomework.deadlineLabel')}: <span className="font-medium text-[var(--ws-text)]">{viewHw.deadline}</span>
              </div>

              {/* problem list */}
              <div>
                <p className="text-sm font-medium text-[var(--ws-muted)] mb-2">{t('instructorHomework.problemListTitle')}</p>
                <div className="border border-[var(--ws-border)] rounded-xl overflow-hidden divide-y divide-[var(--ws-border)] bg-[var(--ws-panel2)]">
                  {problemsOf(viewHw.id).map((p, i) => {
                    const dc: Record<string, string> = {
                      Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      Hard: 'bg-red-100 text-red-800 border-red-200',
                    };
                    const dl: Record<string, string> = {
                      Easy: t('instructorHomework.difficultyEasy'),
                      Medium: t('instructorHomework.difficultyMedium'),
                      Hard: t('instructorHomework.difficultyHard'),
                    };
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                        <span className="text-xs text-[var(--ws-muted)] font-mono w-5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--ws-text)] truncate">{p.title}</p>
                          <p className="text-[11px] text-[var(--ws-muted)] truncate">{p.statement.slice(0, 70)}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${dc[p.difficulty]}`}>{dl[p.difficulty]}</span>
                        <span className="text-[11px] text-[var(--ws-muted)] w-9 text-right">{p.points}{t('instructorHomework.pointsSuffix')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => { setViewId(null); openEdit(viewHw); }} className="w-full py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] shadow-md flex items-center justify-center gap-2">
                <Edit3 size={15} /> {t('instructorHomework.editThisHomework')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
