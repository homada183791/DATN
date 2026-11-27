import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/http';
import { useSubmissionsQuery } from '../../api/submissions';
import { formatVNFull } from '../../utils/dateTime';
import SubmissionDetailModal from '../../components/SubmissionDetailModal';
import {
  Search,
  Filter,
  ChevronDown,
  Send,
  AlertTriangle,
  MessageSquare,
  Star,
} from 'lucide-react';
import { formatLanguageName } from '../../config/languages';
import { attemptNumbers } from '../../utils/attempts';

interface SubmissionRow {
  id: string;
  problemId: string;
  problemTitle: string;
  userId: string;
  username: string;
  language: string;
  verdict: string;
  score?: number;
  instructorScore?: number | null;
  instructorFeedback?: string | null;
  gradedAt?: string | null;
  executionTime: number | null;
  memory: number | null;
  timestamp: string;
  code: string;
}

const verdictByStatus: Record<string, string> = {
  PENDING: 'PENDING',
  IN_QUEUE: 'IN_QUEUE',
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  COMPILE_ERROR: 'CE',
  RUNTIME_ERROR: 'RTE',
};

const verdictColors: Record<string, string> = {
  AC: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
  WA: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
  TLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
  MLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
  RTE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
  CE: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
  PENDING: 'text-(--ws-text) bg-(--ws-panel2) border-(--ws-border)',
  IN_QUEUE: 'text-(--ws-text) bg-(--ws-panel2) border-(--ws-border)',
};

export default function Submission() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, error } = useSubmissionsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const isInstructor = user?.role === 'instructor';

  const allSubmissions: SubmissionRow[] = (data ?? []).map((submission) => ({
    id: submission.id,
    problemId: submission.problem_id,
    problemTitle: submission.problem_title,
    userId: submission.user_id,
    username: submission.username,
    language: submission.language,
    verdict: verdictByStatus[submission.status] ?? submission.status,
    score: submission.score,
    instructorScore: submission.instructor_score,
    instructorFeedback: submission.instructor_feedback,
    gradedAt: submission.graded_at,
    executionTime: submission.execution_time,
    memory: submission.memory_used,
    timestamp: submission.created_at,
    code: submission.source_code,
  }));

  // "Lần nộp thứ N" của từng người cho từng bài, thay cho mã bài nộp nội bộ
  const attempts = attemptNumbers(allSubmissions, (s) => `${s.userId}:${s.problemId}`, (s) => s.timestamp);

  const filteredSubmissions = allSubmissions.filter((s) => {
    const matchesSearch =
      s.problemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerdict = verdictFilter === 'all' || s.verdict === verdictFilter;
    const matchesLanguage = languageFilter === 'all' || s.language === languageFilter;
    return matchesSearch && matchesVerdict && matchesLanguage;
  });

  const languages = [...new Set(allSubmissions.map((s) => s.language))];

  const handleOpenDetail = (sub: SubmissionRow) => setSelectedSubmission(sub.id);

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-(--ws-muted)">{t('submission.loading')}</div>;
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-10 text-center shadow-sm">
        <AlertTriangle size={40} className="text-(--ws-faint) mx-auto mb-3" />
        <h2 className="text-xl font-bold text-(--ws-text)">{t('submission.loadError')}</h2>
        <p className="mt-2 text-sm text-(--ws-muted)">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">
            {isInstructor
              ? t('submission.instructorTitle', 'Quản lý bài nộp & Chấm điểm')
              : t('submission.studentTitle', 'Lịch sử nộp bài')}
          </h2>
          <p className="text-xs text-(--ws-muted) mt-0.5">
            {isInstructor
              ? t('submission.instructorSubtitle', 'Theo dõi, chấm điểm thủ công và chấm lại các bài nộp của học viên')
              : t('submission.studentSubtitle', 'Theo dõi kết quả chấm tự động và nhận xét từ giảng viên')}
          </p>
        </div>
        <span className="text-sm font-semibold text-(--ws-muted) bg-(--ws-panel2) border border-(--ws-border) px-3 py-1 rounded-full">
          {t('submission.resultCount', { count: filteredSubmissions.length })}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('submission.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showFilters
              ? 'bg-(--ws-accent)/10 border-(--ws-accent)/30 text-(--ws-accent)'
              : 'bg-(--ws-panel) border-(--ws-border) text-(--ws-text) hover:text-(--ws-text)'
          }`}
        >
          <Filter size={16} /> {t('instructorStudent.filterButton', 'Bộ lọc')}{' '}
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-(--ws-panel) border border-(--ws-border) rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-(--ws-muted) mb-1.5 font-semibold uppercase tracking-wider">
              {t('submission.colVerdict', 'Kết quả')}
            </label>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="px-3 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) focus:outline-none focus:ring-1 focus:ring-(--ws-accent)"
            >
              <option value="all">{t('instructorContest.filterAll', 'Tất cả')}</option>
              <option value="AC">Accepted (AC)</option>
              <option value="WA">Wrong Answer (WA)</option>
              <option value="TLE">Time Limit Exceeded (TLE)</option>
              <option value="MLE">Memory Limit Exceeded (MLE)</option>
              <option value="RTE">Runtime Error (RTE)</option>
              <option value="CE">Compile Error (CE)</option>
              <option value="PENDING">{t('submission.pending')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-(--ws-muted) mb-1.5 font-semibold uppercase tracking-wider">
              {t('submission.colLanguage', 'Ngôn ngữ')}
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-3 py-1.5 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) focus:outline-none focus:ring-1 focus:ring-(--ws-accent)"
            >
              <option value="all">{t('instructorContest.filterAll', 'Tất cả')}</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {formatLanguageName(l)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal submissionId={selectedSubmission} onClose={() => setSelectedSubmission(null)} />
      )}

      {/* Submissions Table */}
      <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--ws-border) bg-(--ws-panel2)/50">
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colAttempt')}
                </th>
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colProblem', 'Bài tập')}
                </th>
                {isInstructor && (
                  <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                    {t('submission.colSubmitter', 'Người nộp')}
                  </th>
                )}
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colVerdict', 'Kết quả')}
                </th>
                <th className="text-center text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.instructorScoreColLabel')}
                </th>
                <th className="text-left text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colLanguage', 'Ngôn ngữ')}
                </th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colTime', 'Thời gian')}
                </th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colMemory', 'Bộ nhớ')}
                </th>
                <th className="text-right text-xs font-semibold text-(--ws-text) py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colSubmittedAt', 'Thời điểm')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-(--ws-border)/50 hover:bg-(--ws-hover)/60 cursor-pointer transition-colors"
                  onClick={() => handleOpenDetail(sub)}
                >
                  <td className="py-3 px-4 text-sm text-(--ws-muted) tabular-nums" title={t('submission.attemptTitle', { n: attempts.get(sub.id) ?? 1 })}>
                    #{attempts.get(sub.id) ?? 1}
                  </td>
                  <td className="py-3 px-4 text-sm text-(--ws-text) font-semibold">{sub.problemTitle}</td>
                  {isInstructor && (
                    <td className="py-3 px-4 text-sm text-(--ws-text)">@{sub.username}</td>
                  )}
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        verdictColors[sub.verdict] ?? 'text-(--ws-text) bg-(--ws-panel2) border-(--ws-border)'
                      }`}
                    >
                      {sub.verdict}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {sub.instructorScore != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-(--ws-warn) bg-(--ws-warn-soft) border border-(--ws-warn)/35 px-2 py-0.5 rounded-full">
                        <Star size={11} className="inline-block align-[-2px] fill-current" aria-hidden="true" /> {sub.instructorScore}/10
                        {sub.instructorFeedback && <MessageSquare size={11} className="text-(--ws-warn)" />}
                      </span>
                    ) : (
                      <span className="text-xs text-(--ws-muted)">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-(--ws-text)">{formatLanguageName(sub.language)}</td>
                  <td className="py-3 px-4 text-sm text-(--ws-text) text-right">
                    {sub.executionTime != null ? `${sub.executionTime}ms` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-(--ws-text) text-right">
                    {sub.memory != null ? `${sub.memory}MB` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-(--ws-muted) text-right">
                    {formatVNFull(sub.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSubmissions.length === 0 && (
          <div className="p-12 text-center">
            <Send size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="text-(--ws-muted)">{t('submission.emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
}