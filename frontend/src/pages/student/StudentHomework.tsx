import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useClass } from '../../context/ClassContext';
import { useHomework, deadlineProgress } from '../../context/HomeworkContext';
import { formatVNFull } from '../../utils/dateTime';
import { useTranslation } from 'react-i18next';
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
  Easy:   'text-(--ws-ok) bg-(--ws-ok-soft)',
  Medium: 'text-(--ws-warn) bg-(--ws-warn-soft)',
  Hard:   'text-(--ws-danger) bg-(--ws-danger-soft)',
};

export default function StudentHomework() {
  const { t } = useTranslation();
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
  const deadlineLabel = (p: ReturnType<typeof deadlineProgress>) => p.overdue
    ? t('deadline.expired')
    : p.daysLeft <= 0 ? t('deadline.today')
    : p.daysLeft === 1 ? t('deadline.oneDay')
    : t('deadline.days', { count: p.daysLeft });

  return (
    <div className="space-y-6 text-(--ws-text)">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold font-serif text-(--ws-text)">{t('studentHomework.homeworkTitle')}</h2>
          <p className="text-sm text-(--ws-muted) mt-1">
            {t('studentHomework.homeworkSummary', { total: myHomeworks.length, open: activeCount, closed: closedCount })}
          </p>
        </div>
        <Link
          to="/student/class"
          className="flex items-center gap-2 text-sm text-(--ws-muted) hover:text-(--ws-accent) transition-colors"
        >
          <GraduationCap size={15} /> {t('studentHomework.manageClasses')}
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('studentHomework.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel2) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) outline-none placeholder:text-(--ws-faint) focus:ring-2 focus:ring-(--ws-accent)"
          />
          {search && (
            <button aria-label={t('common.close')} onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ws-muted) hover:text-(--ws-text)">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-(--ws-muted)" />
            <span className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider">{t('studentClass.status')}:</span>
            <div className="flex gap-1.5">
              {([
                { value: 'all',    label: t('calendar.all') },
                { value: 'active', label: t('studentContest.open') },
                { value: 'closed', label: t('studentContest.closed') },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === value
                      ? value === 'active' ? 'bg-(--ws-ok) text-(--ws-on-accent)'
                        : value === 'closed' ? 'bg-(--ws-danger) text-(--ws-on-accent)'
                        : 'bg-(--ws-accent) text-(--ws-on-accent)'
                      : 'bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-hover)'
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
              <div className="h-5 w-px bg-(--ws-border) hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-(--ws-muted)" />
                <span className="text-xs font-semibold text-(--ws-muted) uppercase tracking-wider">{t('studentContest.classLabel')}:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setClassFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      classFilter === 'all' ? 'bg-(--ws-accent) text-(--ws-on-accent)' : 'bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-hover)'
                    }`}
                  >
                    {t('calendar.all')}
                  </button>
                  {enrolledClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => setClassFilter(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all truncate max-w-[120px] ${
                        classFilter === cls.id ? 'bg-(--ws-accent) text-(--ws-on-accent)' : 'bg-(--ws-panel2) text-(--ws-text) hover:bg-(--ws-hover)'
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
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-14 text-center shadow-sm">
          <ClipboardList size={48} className="text-(--ws-faint) mx-auto mb-4" />
          <p className="font-semibold text-(--ws-text)">
            {myHomeworks.length === 0 ? t('studentHomework.emptyNoClassTitle') : t('studentHomework.emptyFiltered')}
          </p>
          <p className="text-sm text-(--ws-muted) mt-1">
            {myHomeworks.length === 0
              ? t('studentHomework.emptyNoClassSubtitle')
              : t('studentContest.changeHomeworkFilters')}
          </p>
          {myHomeworks.length === 0 && (
            <Link to="/student/class" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md">
              <GraduationCap size={16} /> {t('studentClass.joinThisClass')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((hw) => {
            const p = deadlineProgress(hw.deadline, hw.createdAt);
            const tasks = problemsOf(hw.id);
            const hasLinkable = tasks.some((t) => !!t.problem_id);
            return (
              <div
                key={hw.id}
                className="group bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-5 shadow-sm hover:border-(--ws-accent)/40 hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setSelectedHwId(hw.id); setExpandedProblem(null); }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-(--ws-text) group-hover:text-(--ws-accent)">{hw.title}</h3>
                      {/* Status badge */}
                      {hw.status === 'active' ? (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-(--ws-ok-soft) text-(--ws-ok) border border-(--ws-ok)/35 font-semibold">
                          <CheckCircle2 size={10} /> {t('studentContest.open')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-(--ws-danger-soft) text-(--ws-danger) border border-(--ws-danger)/35 font-semibold">
                          <AlertTriangle size={10} /> {t('studentContest.closed')}
                        </span>
                      )}
                      {hasLinkable && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-(--ws-info-soft) text-(--ws-info) border border-(--ws-info)/35 rounded font-bold">
                          {t('studentHomework.canSubmit')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-(--ws-muted)">
                      <span className="flex items-center gap-1"><GraduationCap size={12} />{hw.className}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} />{t('studentContest.problemCount', { count: hw.problemCount })}</span>
                      <span className={`flex items-center gap-1 font-medium ${p.overdue ? 'text-(--ws-danger)' : p.daysLeft <= 3 ? 'text-(--ws-warn)' : 'text-(--ws-text)'}`}>
                        <Clock size={12} />{formatVNFull(hw.deadline)}
                      </span>
                    </div>
                  </div>

                  {/* Right: deadline label + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold ${p.overdue ? 'text-(--ws-danger)' : p.daysLeft <= 3 ? 'text-(--ws-warn)' : 'text-(--ws-ok)'}`}>
                      {deadlineLabel(p)}
                    </span>
                    <ChevronRight size={18} className="text-(--ws-faint) group-hover:text-(--ws-accent) transition-colors" />
                  </div>
                </div>

                {/* Deadline progress */}
                <div className="mt-3 w-full h-1.5 bg-(--ws-panel2) rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${p.overdue ? 'bg-(--ws-danger)' : p.daysLeft <= 3 ? 'bg-(--ws-warn)' : 'bg-(--ws-accent)'}`}
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
          className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-95 flex items-center justify-center p-4"
          onClick={() => setSelectedHwId(null)}
        >
          <div
            className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--ws-border) sticky top-0 bg-(--ws-panel2) z-10">
              <div>
                <h3 className="font-bold font-serif text-lg text-(--ws-text)">{selectedHw.title}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5 flex items-center gap-1">
                  <GraduationCap size={11} />{selectedHw.className}
                </p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setSelectedHwId(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Deadline tracking */}
              {(() => {
                const p = deadlineProgress(selectedHw.deadline, selectedHw.createdAt);
                return (
                  <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5 text-(--ws-muted)">
                        <Calendar size={13} /> {t('studentContest.deadlineLabel')}:
                        <span className="font-semibold text-(--ws-text)">{formatVNFull(selectedHw.deadline)}</span>
                      </span>
                      <span className={`font-bold ${p.overdue ? 'text-(--ws-danger)' : p.daysLeft <= 3 ? 'text-(--ws-warn)' : 'text-(--ws-ok)'}`}>
                        {deadlineLabel(p)}
                      </span>
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

              {/* Description */}
              {selectedHw.description && (
                <p className="text-sm text-(--ws-text) leading-relaxed">{selectedHw.description}</p>
              )}

              {/* Problem list */}
              <div>
                <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3">
                  {t('studentHomework.problemListTitle')} ({hwProblems.length})
                </h4>
                {hwProblems.length === 0 ? (
                  <p className="text-sm text-(--ws-muted) text-center py-6">{t('studentHomework.emptyProblems')}</p>
                ) : (
                  <div className="space-y-2">
                    {hwProblems.map((p, i) => {
                      const open = expandedProblem === p.id;
                      const hasLink = !!p.problem_id;
                      return (
                        <div key={p.id} className="bg-(--ws-panel) rounded-xl border border-(--ws-border) overflow-hidden">
                          {/* Row header */}
                          <div className="flex items-center gap-3 p-3">
                            <button
                              onClick={() => setExpandedProblem(open ? null : p.id)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <span className="text-xs text-(--ws-muted) font-mono w-5 shrink-0">{i + 1}.</span>
                              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold shrink-0 ${diffColors[p.difficulty] ?? 'bg-(--ws-panel2) text-(--ws-text)'}`}>
                                {p.difficulty}
                              </span>
                              <span className="text-sm font-medium text-(--ws-text) truncate">{p.title}</span>
                              {hasLink && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-(--ws-info-soft) text-(--ws-info) border border-(--ws-info)/35 rounded font-bold shrink-0">
                                  {t('studentHomework.canSubmit')}
                                </span>
                              )}
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-(--ws-muted)">{t('studentHomework.pointsUnit', { count: p.points })}</span>
                              <button aria-label={t('common.next')}
                                onClick={() => setExpandedProblem(open ? null : p.id)}
                                className="p-1.5 bg-(--ws-panel2) rounded-lg text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
                              >
                                <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
                              </button>
                              {hasLink ? (
                                <Link
                                  to={`/student/problem/${p.problem_id}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-lg hover:bg-(--ws-accent-strong) transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Play size={12} /> {t('studentContest.solveTask')}
                                </Link>
                              ) : (
                                <span className="p-1.5 bg-(--ws-panel2) rounded-lg text-(--ws-faint) cursor-not-allowed" title={t('studentHomework.noProblemLinkTitle')}>
                                  <Play size={14} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
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
                              {hasLink && (
                                <div className="mt-3">
                                  <Link
                                    to={`/student/problem/${p.problem_id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Play size={14} /> {t('studentHomework.nowSolving')}
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
