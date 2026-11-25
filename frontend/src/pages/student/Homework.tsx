import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClass } from '../../context/ClassContext';
import { useHomework } from '../../context/HomeworkContext';
import { formatVNFull } from '../../utils/dateTime';
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
  const { t } = useTranslation();
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
    active: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
    closed: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)',
    upcoming: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
  };

  const statusLabels: Record<string, string> = {
    active: t('instructorHomework.statusActive'),
    closed: t('instructorHomework.statusClosed'),
    upcoming: t('instructorHomework.statusUpcoming'),
  };

  const diffColors: Record<string, string> = {
    Easy: 'text-(--ws-ok) bg-(--ws-ok-soft)/50',
    Medium: 'text-(--ws-warn) bg-(--ws-warn-soft)/50',
    Hard: 'text-(--ws-danger) bg-(--ws-danger-soft)/50',
  };

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.problems')}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-(--ws-muted)">
            {t('studentHomework.activeCount', { count: visibleHomeworks.filter((h) => h.status === 'active').length })}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('studentHomework.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'upcoming', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm'
                  : 'bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) border border-(--ws-border)'
              }`}
            >
              {f === 'all' ? t('instructorContest.filterAll') : statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Homework Detail Modal */}
      {selectedHomework && selectedHw && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setSelectedHomework(null)}>
          <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">{selectedHw.title}</h3>
              <button aria-label={t('common.close')} onClick={() => setSelectedHomework(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-(--ws-text)">
                  <Calendar size={14} /> Hạn: {formatVNFull(selectedHw.deadline)}
                </div>
                <div className="flex items-center gap-2 text-sm text-(--ws-text)">
                  <BookOpen size={14} /> {selectedHw.problemCount} {t('instructorHomework.problemsUnit')}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedHw.status]}`}>
                  {statusLabels[selectedHw.status]}
                </span>
              </div>
              <p className="text-sm text-(--ws-text) mb-6 leading-relaxed">{selectedHw.description}</p>
              <h4 className="text-sm font-bold text-(--ws-text) font-serif mb-3">{t('studentHomework.problemListTitle')}</h4>
              <div className="space-y-2">
                {hwProblems.map((p, i) => {
                  const open = expandedProblem === p.id;
                  const hasLink = !!p.problem_id;
                  return (
                    <div key={p.id} className="bg-(--ws-panel) rounded-xl border border-(--ws-border) overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <button
                          onClick={() => setExpandedProblem(open ? null : p.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <span className="text-xs text-(--ws-muted) w-6">{i + 1}.</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${diffColors[p.difficulty]}`}>
                            {p.difficulty}
                          </span>
                          <span className="text-sm text-(--ws-text) font-medium truncate">{p.title}</span>
                          {hasLink && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-(--ws-info-soft) text-(--ws-info) border border-(--ws-info)/35 rounded font-bold shrink-0">
                              CÓ THỂ NỘP
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-(--ws-muted)">{p.points}{t('instructorHomework.pointsSuffix')}</span>
                          <button
                            onClick={() => setExpandedProblem(open ? null : p.id)}
                            className="p-1.5 bg-(--ws-panel2) rounded-lg text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
                            title={open ? t('studentHomework.collapseStatement') : t('studentHomework.viewStatement')}
                          >
                            <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                          </button>
                          {hasLink ? (
                            <Link
                              to={`/student/problem/${p.problem_id}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-lg hover:bg-(--ws-accent-strong) transition-colors"
                              title="Vào làm bài và nộp code"
                            >
                              <Play size={12} /> Làm bài
                            </Link>
                          ) : (
                            <span
                              className="p-1.5 bg-(--ws-panel2) rounded-lg text-(--ws-faint) cursor-not-allowed"
                              title="Bài này chỉ có đề mô tả, chưa có bài tập để nộp code"
                            >
                              <Play size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div className="px-4 pb-4 pt-1 border-t border-(--ws-border)/60 animate-fade-in">
                          <p className="text-sm text-(--ws-text) leading-6 whitespace-pre-wrap font-mono text-[13px]">{p.statement}</p>
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
                                className="inline-flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-sm transition-colors"
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
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-12 text-center shadow-sm">
            <GraduationCap size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="font-semibold text-(--ws-text)">{t('studentHomework.emptyNoClassTitle')}</p>
            <p className="text-sm text-(--ws-muted) mt-1 mb-5">{t('studentHomework.emptyNoClassSubtitle')}</p>
            <Link to="/student/class" className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) shadow-md">
              <GraduationCap size={16} /> {t('studentHomework.joinClassLink')}
            </Link>
          </div>
        ) : filteredHomeworks.length === 0 ? (
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-12 text-center shadow-sm">
            <BookOpen size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="text-(--ws-muted)">{t('studentHomework.emptyFiltered')}</p>
          </div>
        ) : (
          filteredHomeworks.map((hw) => (
            <div
              key={hw.id}
              className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 hover:shadow-md hover:border-(--ws-accent)/30 transition-all cursor-pointer shadow-sm"
              onClick={() => setSelectedHomework(hw.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold font-serif text-(--ws-text)">{hw.title}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[hw.status]}`}>
                      {statusLabels[hw.status]}
                    </span>
                  </div>
                  <p className="text-sm text-(--ws-text) mb-3 leading-relaxed">{hw.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-(--ws-muted)">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Hạn: {formatVNFull(hw.deadline)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={14} /> {hw.problemCount} {t('instructorHomework.problemsUnit')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Code2 size={14} /> {hw.className}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={20} className="text-(--ws-muted)" />
                  </div>
                  {/* Progress */}
                  <div className="w-40">
                    <div className="flex items-center justify-between text-xs text-(--ws-muted) mb-1">
                      <span>{t('studentHomework.progress')}</span>
                      <span>{hw.completedCount}/{hw.problemCount}</span>
                    </div>
                    <div className="w-full bg-(--ws-panel2) rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          hw.completedCount === hw.problemCount
                            ? 'bg-linear-to-r from-(--ws-ok) to-(--ws-ok)'
                            : 'bg-linear-to-r from-(--ws-accent) to-(--ws-ok)'
                        }`}
                        style={{ width: `${(hw.completedCount / hw.problemCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  {hw.completedCount === hw.problemCount && (
                    <span className="flex items-center gap-1 text-xs text-(--ws-ok) font-medium">
                      <CheckCircle2 size={14} /> {t('studentHomework.completed')}
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
