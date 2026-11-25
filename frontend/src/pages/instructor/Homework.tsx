import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClass } from '../../context/ClassContext';
import { useHomework, deadlineProgress, HomeworkInput, HomeworkProblem, Homework } from '../../context/HomeworkContext';
import ProblemManager from '../../components/ProblemManager';
import { formatVNFull, toDatetimeLocal } from '../../utils/dateTime';
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
  Loader2,
  Lock,
} from 'lucide-react';

type EditorState = { mode: 'create' | 'edit'; hw?: Homework } | null;

const emptyForm = { title: '', description: '', deadline: '', classId: '' };

export default function InstructorHomework() {
  const { t } = useTranslation();
  const { myClasses, membersOf } = useClass();
  const { allHomeworks, isLoading, refetch, problemsOf, createHomework, updateHomework, deleteHomework } = useHomework();

  const [editor, setEditor] = useState<EditorState>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [form, setForm] = useState(emptyForm);
  const [draftProblems, setDraftProblems] = useState<HomeworkProblem[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  // Backend findAll(userId, 'INSTRUCTOR') đã filter theo các lớp do giảng viên này quản lý (admin_id = userId).
  // Do đó allHomeworks chính là toàn bộ bài tập của giảng viên hiện tại.
  const myHomeworks = allHomeworks;

  const filtered = classFilter === 'all' ? myHomeworks : myHomeworks.filter((h) => h.classId === classFilter);
  const viewHw = myHomeworks.find((h) => h.id === viewId);

  const activeCount = myHomeworks.filter((h) => h.status === 'active').length;
  const overdueSoon = myHomeworks.filter((h) => {
    const p = deadlineProgress(h.deadline, h.createdAt);
    return !p.overdue && p.hoursLeft <= 24 && h.status === 'active';
  }).length;

  const openCreate = () => {
    setForm({ ...emptyForm, classId: myClasses[0]?.id ?? '' });
    setDraftProblems([]);
    setError('');
    setIsSaving(false);
    setEditor({ mode: 'create' });
  };

  const openEdit = (hw: Homework) => {
    setForm({
      title: hw.title,
      description: hw.description,
      // hw.deadline là ISO UTC từ BE → convert sang datetime-local theo UTC+7
      deadline: toDatetimeLocal(hw.deadline),
      classId: hw.classId,
    });
    setDraftProblems(problemsOf(hw.id));
    setError('');
    setIsSaving(false);
    setEditor({ mode: 'edit', hw });
  };

  const save = async () => {
    if (form.title.trim().length < 3) return setError(t('instructorHomework.errors.titleTooShort'));
    if (!form.classId) return setError(t('instructorHomework.errors.classRequired'));
    if (!form.deadline) return setError(t('instructorHomework.errors.deadlineRequired'));
    if (draftProblems.length === 0) return setError(t('instructorHomework.errors.problemsRequired'));
    const cls = myClasses.find((c) => c.id === form.classId);
    const deadline = form.deadline.replace('T', ' ');
    const payload: HomeworkInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      deadline,
      problems: draftProblems,
      classId: form.classId,
      className: cls ? `${cls.name} - ${cls.code}` : '',
      totalStudents: membersOf(form.classId).length,
    };
    
    setIsSaving(true);
    setError('');
    try {
      if (editor?.mode === 'edit' && editor.hw) {
        await updateHomework(editor.hw.id, payload);
      } else {
        await createHomework(payload);
      }
      await refetch();
      setEditor(null);
    } catch (e: any) {
      setError(e.message || t('instructorHomework.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const statusChip: Record<string, string> = {
    active: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
    upcoming: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
    closed: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)',
  };
  const statusLabel: Record<string, string> = {
    active: t('instructorHomework.statusActive'),
    upcoming: t('instructorHomework.statusUpcoming'),
    closed: t('instructorHomework.statusClosed'),
  };

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.homework')}</h2>
          <p className="text-sm text-(--ws-muted) mt-1">
            {t('instructorHomework.subtitle', { count: myClasses.length })}
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={myClasses.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={18} /> {t('instructorHomework.createNew')}
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <ClipboardList size={20} className="text-(--ws-accent) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{myHomeworks.length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorHomework.statTotal')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <CheckCircle2 size={20} className="text-(--ws-ok) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{activeCount}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorHomework.statusActive')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all">
          <AlertTriangle size={20} className="text-(--ws-danger) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif">{overdueSoon}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorHomework.statDueSoon')}</p>
        </div>
      </div>

      {/* class filter */}
      {myClasses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setClassFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              classFilter === 'all' ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm' : 'bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
            }`}
          >
            {t('instructorHomework.filterAllClasses')}
          </button>
          {myClasses.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassFilter(c.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                classFilter === c.id ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm' : 'bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      )}

      {/* list */}
      {isLoading && myHomeworks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-14 text-center shadow-sm">
          <ClipboardList size={48} className="text-(--ws-faint) mx-auto mb-4" />
          <p className="font-semibold text-(--ws-text)">
            {myClasses.length === 0 ? t('instructorHomework.emptyNoClassTitle') : t('instructorHomework.emptyTitle')}
          </p>
          <p className="text-sm text-(--ws-muted) mt-1 mb-5">
            {myClasses.length === 0
              ? t('instructorHomework.emptyNoClass')
              : t('instructorHomework.emptySubtitle')}
          </p>
          {myClasses.length === 0 && (
            <Link
              to="/instructor/classes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md"
            >
              <GraduationCap size={16} /> {t('instructorHomework.goCreateClassBtn')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((hw) => {
            const p = deadlineProgress(hw.deadline, hw.createdAt);
            return (
              <div key={hw.id} className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 hover:shadow-md transition-all shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold font-serif text-(--ws-text)">{hw.title}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip[hw.status]}`}>
                        {statusLabel[hw.status]}
                      </span>
                    </div>
                    <p className="text-sm text-(--ws-text) mb-3 leading-relaxed line-clamp-2">{hw.description || t('instructorClass.noDescription')}</p>
                    <div className="flex items-center gap-4 text-sm text-(--ws-muted) flex-wrap">
                      <span className="flex items-center gap-1"><GraduationCap size={14} /> {hw.className || myClasses.find((c) => c.id === hw.classId)?.name || t('instructorHomework.classFallback')}</span>
                      <span className="flex items-center gap-1"><BookOpen size={14} /> {hw.problemCount} {t('instructorHomework.problemsUnit')}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> {hw.submittedStudents}/{hw.totalStudents} {t('instructorHomework.submittedOfTotalLabel')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewId(hw.id)} className="p-2 bg-(--ws-panel2) rounded-lg text-(--ws-text) hover:bg-(--ws-hover) transition-colors" title={t('instructorContest.viewDetail')}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openEdit(hw)} className="p-2 bg-(--ws-panel2) rounded-lg text-(--ws-text) hover:bg-(--ws-hover) transition-colors" title={t('common.edit')}>
                      <Edit3 size={16} />
                    </button>
                    {confirmDelete === hw.id ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={async () => { setConfirmDelete(null); try { await deleteHomework(hw.id); } catch { setError(t('instructorHomework.errors.deleteFailed')); } }} className="px-2.5 py-1.5 bg-(--ws-danger) text-(--ws-on-accent) text-xs font-semibold rounded-lg hover:bg-(--ws-danger)">{t('common.delete')}</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 bg-(--ws-panel2) text-(--ws-text) text-xs font-semibold rounded-lg hover:bg-(--ws-hover)">{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(hw.id)} className="p-2 text-(--ws-muted) hover:text-(--ws-danger) hover:bg-(--ws-danger-soft) rounded-lg transition-colors" title={t('common.delete')}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* deadline progress bar */}
                <div className="mt-5 pt-4 border-t border-(--ws-border)/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 text-(--ws-muted)">
                      <span className="flex items-center gap-1"><Clock size={14} /> {t('instructorHomework.deadlineInlineLabel')} <span className="font-medium text-(--ws-text)">{formatVNFull(hw.deadline)}</span></span>
                    </span>
                    <span className={`font-semibold ${p.overdue ? 'text-(--ws-danger)' : p.hoursLeft <= 24 ? 'text-(--ws-warn)' : 'text-(--ws-ok)'}`}>
                      {p.label}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-(--ws-panel2) rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.overdue ? 'bg-(--ws-danger)' : p.hoursLeft <= 24 ? 'bg-linear-to-r from-(--ws-warn) to-(--ws-danger)' : 'bg-linear-to-r from-(--ws-accent) to-(--ws-ok)'
                      }`}
                      style={{ width: `${p.overdue ? 100 : p.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== editor modal ===== */}
      {editor && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setEditor(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 bg-(--ws-panel)">
              <h3 className="font-bold font-serif text-[16px]">{editor.mode === 'edit' ? t('instructorHomework.editTitle') : t('instructorHomework.createNew')}</h3>
              <button aria-label={t('common.close')} onClick={() => setEditor(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldTitle')}</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('instructorClass.fieldTitlePlaceholder')} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorHomework.fieldAssignTo')}</label>
                <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)">
                  <option value="">{t('instructorHomework.selectClassOption')}</option>
                  {myClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDeadline')}</label>
                <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t('instructorClass.fieldHwDescriptionPlaceholder')} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) resize-none" />
              </div>

              {/* Problem manager */}
              <ProblemManager problems={draftProblems} onChange={setDraftProblems} />

              {error && <p className="text-xs text-(--ws-danger) font-medium">{error}</p>}
              <p className="text-[11.5px] text-(--ws-muted) bg-(--ws-panel2) border border-(--ws-border) rounded-lg px-3 py-2">
                <Lock size={12} className="inline-block align-[-2px] mr-1" aria-hidden="true" />{t('instructorHomework.visibilityHint')}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--ws-border)">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) text-xs font-semibold rounded-xl hover:bg-(--ws-hover) transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {editor.mode === 'edit' ? t('instructorHomework.saveChanges') : t('instructorClass.assignSubmit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ===== view modal ===== */}
      {viewHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setViewId(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 bg-(--ws-panel) z-10">
              <h3 className="font-bold font-serif text-[16px]">{viewHw.title}</h3>
              <button aria-label={t('common.close')} onClick={() => setViewId(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip[viewHw.status]}`}>{statusLabel[viewHw.status]}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) flex items-center gap-1"><GraduationCap size={12} /> {viewHw.className || myClasses.find((c) => c.id === viewHw.classId)?.name || t('instructorHomework.classFallback')}</span>
              </div>
              <p className="text-sm text-(--ws-muted) leading-relaxed">{viewHw.description || t('instructorClass.noDescription')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center">
                  <p className="text-lg font-bold font-serif">{viewHw.problemCount}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.fieldProblemCount')}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center">
                  <p className="text-lg font-bold font-serif">{viewHw.submittedStudents}/{viewHw.totalStudents}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorHomework.submittedLabel')}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center">
                  <p className="text-lg font-bold font-serif text-(--ws-accent)">{deadlineProgress(viewHw.deadline).label}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">Deadline</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-(--ws-muted)">
                <Calendar size={14} className="text-(--ws-muted)" /> {t('instructorHomework.deadlineInlineLabel')} <span className="font-medium text-(--ws-text)">{formatVNFull(viewHw.deadline)}</span>
              </div>

              {/* problem list */}
              <div>
                <p className="text-sm font-medium text-(--ws-muted) mb-2">{t('instructorHomework.problemListTitle')}</p>
                <div className="border border-(--ws-border) rounded-xl overflow-hidden divide-y divide-(--ws-border) bg-(--ws-panel2)">
                  {problemsOf(viewHw.id).map((p, i) => {
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
                    const Wrapper: any = p.problem_id ? Link : 'div';
                    return (
                      <Wrapper key={p.id} {...(p.problem_id ? { to: `/instructor/problem/${p.problem_id}`, title: p.title } : {})} className={`flex items-center gap-3 px-3.5 py-2.5 ${p.problem_id ? 'hover:bg-(--ws-hover) cursor-pointer transition-colors' : ''}`}>
                        <span className="text-xs text-(--ws-muted) font-mono w-5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-(--ws-text) truncate">{p.title}</p>
                          <p className="text-[11px] text-(--ws-muted) truncate">{p.statement?.slice(0, 70) || t('instructorHomework.problemNoStatement')}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${dc[p.difficulty]}`}>{dl[p.difficulty]}</span>
                        <span className="text-[11px] text-(--ws-muted) w-9 text-right">{p.points}{t('instructorHomework.pointsSuffix')}</span>
                      </Wrapper>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => { setViewId(null); openEdit(viewHw); }} className="w-full py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md flex items-center justify-center gap-2">
                <Edit3 size={15} /> {t('instructorHomework.editThisHomework')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
