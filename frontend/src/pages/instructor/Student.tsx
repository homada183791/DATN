import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClass } from '../../context/ClassContext';
import { useSubmissionsQuery } from '../../api/submissions';
import {
  Users,
  Search,
  Filter,
  TrendingUp,
  ChevronDown,
  X,
  Eye,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { formatVNFull } from '../../utils/dateTime';
import { formatLanguageName } from '../../config/languages';

export default function InstructorStudent() {
  const { t } = useTranslation();
  const { myClasses, membersOf } = useClass();
  const { data: rawSubmissions = [] } = useSubmissionsQuery();

  const normalizeVerdict = (status: string): string => {
    switch (status) {
      case 'ACCEPTED':
        return 'AC';
      case 'WRONG_ANSWER':
        return 'WA';
      case 'TIME_LIMIT_EXCEEDED':
        return 'TLE';
      case 'COMPILE_ERROR':
        return 'CE';
      case 'RUNTIME_ERROR':
        return 'RTE';
      default:
        return status;
    }
  };

  const submissions = useMemo(() => {
    return rawSubmissions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      username: s.username,
      problemTitle: s.problem_title,
      verdict: normalizeVerdict(s.status),
      language: s.language,
      executionTime: s.execution_time ?? 0,
      timestamp: s.created_at,
    }));
  }, [rawSubmissions]);

  const students = useMemo(() => {
    return myClasses.flatMap((classInfo) =>
      membersOf(classInfo.id).map((member) => {
        const studentSubs = submissions.filter(
          (sub) => sub.userId === member.id || sub.username === member.username
        );
        const solvedProblemIds = new Set(
          rawSubmissions
            .filter(
              (sub) =>
                (sub.user_id === member.id || sub.username === member.username) &&
                sub.status === 'ACCEPTED'
            )
            .map((sub) => sub.problem_id)
        );
        const latestSub = studentSubs[0];

        return {
          id: member.id || member.username,
          username: member.username,
          fullName: member.fullName || member.email || member.username,
          email: member.email || `${member.username}@student.edu.vn`,
          solvedCount: solvedProblemIds.size > 0 ? solvedProblemIds.size : (member.solvedCount ?? 0),
          submissionCount: studentSubs.length > 0 ? studentSubs.length : (member.submissionCount ?? 0),
          rating: member.rating ?? 1200,
          lastActive: latestSub?.timestamp ? formatVNFull(latestSub.timestamp) : 'Chưa có hoạt động',
          classId: classInfo.id,
          className: `${classInfo.name} - ${classInfo.code}`,
        };
      })
    );
  }, [myClasses, membersOf, submissions, rawSubmissions]);

  const classes = myClasses;
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'solved' | 'submissions'>('rating');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasDocument = typeof document !== 'undefined';

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'all' || s.classId === classFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'solved') return b.solvedCount - a.solvedCount;
      return b.submissionCount - a.submissionCount;
    });

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const selectedStudentSubs = submissions.filter(
    (s) => s.userId === selectedStudent || s.username === selectedStudentData?.username
  );

  const acCount = selectedStudentSubs.filter((s) => s.verdict === 'AC').length;

  const verdictColors: Record<string, string> = {
    AC: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
    ACCEPTED: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
    WA: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    WRONG_ANSWER: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    TLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    TIME_LIMIT_EXCEEDED: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    MLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    RTE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    RUNTIME_ERROR: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    CE: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
    COMPILE_ERROR: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
    PE: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 2000) return 'text-(--ws-warn)';
    if (rating >= 1800) return 'text-(--ws-info)';
    if (rating >= 1600) return 'text-(--ws-info)';
    if (rating >= 1400) return 'text-(--ws-ok)';
    return 'text-(--ws-text)';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 2000) return { label: 'Grandmaster', color: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35' };
    if (rating >= 1800) return { label: 'Candidate Master', color: 'bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35' };
    if (rating >= 1600) return { label: 'Expert', color: 'bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35' };
    if (rating >= 1400) return { label: 'Specialist', color: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35' };
    return { label: 'Pupil', color: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)' };
  };

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('instructorStudent.pageTitle')}</h2>
        <span className="text-sm text-(--ws-muted)">{t('instructorStudent.countSuffix', { count: filteredStudents.length })}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <Users size={20} className="text-(--ws-info) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-(--ws-text)">{students.length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.totalStudents')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <CheckCircle2 size={20} className="text-(--ws-accent) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-(--ws-text)">{students.filter((s) => s.solvedCount > 100).length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorStudent.statOver100')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <TrendingUp size={20} className="text-(--ws-danger) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-(--ws-text)">
            {students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.rating, 0) / students.length) : 0}
          </p>
          <p className="text-xs text-(--ws-muted) mt-0.5">Rating TB</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <GraduationCap size={20} className="text-(--ws-warn) mx-auto mb-2" />
          <p className="text-2xl font-bold font-serif text-(--ws-text)">{classes.length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('nav.class')}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('instructorStudent.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showFilters ? 'bg-(--ws-accent)/10 border-(--ws-accent)/30 text-(--ws-accent)' : 'bg-(--ws-panel) border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
          }`}
        >
          <Filter size={16} /> {t('instructorStudent.filterButton')} <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-(--ws-panel) border border-(--ws-border) rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-(--ws-muted) mb-1.5 font-semibold uppercase tracking-wider">{t('nav.class')}</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
            >
              <option value="all">{t('instructorContest.filterAll')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-(--ws-muted) mb-1.5 font-semibold uppercase tracking-wider">{t('instructorStudent.sortLabel')}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'solved' | 'submissions')}
              className="px-3 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
            >
              <option value="rating">Rating</option>
              <option value="solved">{t('instructorContest.colSolved')}</option>
              <option value="submissions">{t('instructorStudent.sortSubmissions')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && selectedStudentData && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-full flex items-center justify-center text-(--ws-on-accent) text-lg font-bold font-serif">
                  {selectedStudentData.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-(--ws-text)">{selectedStudentData.fullName}</h3>
                  <p className="text-sm text-(--ws-muted)">@{selectedStudentData.username} • {selectedStudentData.className}</p>
                </div>
              </div>
              <button aria-label={t('common.close')} onClick={() => setSelectedStudent(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* Student Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-(--ws-text)">{selectedStudentData.solvedCount}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.colSolved')}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-(--ws-text)">{selectedStudentData.submissionCount}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorStudent.sortSubmissions')}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center shadow-xs">
                  <p className={`text-lg font-serif font-bold ${getRatingColor(selectedStudentData.rating)}`}>{selectedStudentData.rating}</p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">Rating</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) text-center shadow-xs">
                  <p className="text-lg font-serif font-bold text-(--ws-ok)">
                    {selectedStudentSubs.length ? Math.round((acCount / selectedStudentSubs.length) * 100) : 0}%
                  </p>
                  <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorDashboard.acRate')}</p>
                </div>
              </div>

              {/* Badge */}
              <div className="mb-6">
                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${getRatingBadge(selectedStudentData.rating).color}`}>
                  {getRatingBadge(selectedStudentData.rating).label}
                </span>
              </div>

              {/* Contact */}
              <div className="mb-6 p-4 bg-(--ws-panel2) rounded-xl border border-(--ws-border) shadow-xs leading-relaxed">
                <p className="text-sm text-(--ws-muted) font-medium">Email: <span className="text-(--ws-text)">{selectedStudentData.email}</span></p>
                <p className="text-sm text-(--ws-muted) font-medium mt-1.5">{t('instructorStudent.lastActive')}: <span className="text-(--ws-text)">{selectedStudentData.lastActive}</span></p>
              </div>

              {/* Recent Submissions */}
              <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3">{t('instructorDashboard.recentSubmissions')}</h4>
              <div className="space-y-2">
                {selectedStudentSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-(--ws-panel2) rounded-lg border border-(--ws-border)">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-bold border ${verdictColors[sub.verdict]}`}>
                        {sub.verdict}
                      </span>
                      <div>
                        <p className="text-sm text-(--ws-text) font-semibold">{sub.problemTitle}</p>
                        <p className="text-xs text-(--ws-muted) mt-0.5">{formatLanguageName(sub.language)} • {sub.executionTime}ms</p>
                      </div>
                    </div>
                    <span className="text-xs text-(--ws-muted)">{formatVNFull(sub.timestamp)}</span>
                  </div>
                ))}
                {selectedStudentSubs.length === 0 && (
                  <p className="text-sm text-(--ws-muted) text-center py-4">{t('instructorStudent.noSubmissions')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Students Table */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--ws-border) bg-(--ws-panel2)/50">
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">#</th>
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">{t('instructorClass.colStudent')}</th>
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">{t('instructorStudent.colClass')}</th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">{t('instructorContest.colSolved')}</th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">{t('instructorStudent.sortSubmissions')}</th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">Rating</th>
                <th className="text-center text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">{t('instructorStudent.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const badge = getRatingBadge(student.rating);
                return (
                  <tr key={student.id} className="border-b border-(--ws-border)/50 hover:bg-(--ws-hover)/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-(--ws-muted)">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-linear-to-br from-(--ws-accent-strong) to-(--ws-accent) rounded-full flex items-center justify-center text-(--ws-on-accent) text-xs font-bold">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-(--ws-text) font-semibold">{student.fullName}</p>
                          <p className="text-xs text-(--ws-muted)">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-(--ws-text) font-medium">{student.className}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-(--ws-ok)">
                      {student.solvedCount}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-(--ws-text)">
                      {student.submissionCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-bold ${getRatingColor(student.rating)}`}>{student.rating}</span>
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedStudent(student.id)}
                        className="p-1.5 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-accent) hover:bg-(--ws-hover) transition-colors shadow-xs"
                        title={t('instructorContest.viewDetail')}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <Users size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="text-(--ws-muted)">{t('instructorStudent.emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
