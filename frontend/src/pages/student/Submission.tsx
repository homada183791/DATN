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
} from 'lucide-react';
import { formatLanguageName } from '../../config/languages';

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
  AC: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  WA: 'text-red-700 bg-red-100 border-red-300',
  TLE: 'text-amber-700 bg-amber-100 border-amber-300',
  MLE: 'text-amber-700 bg-amber-100 border-amber-300',
  RTE: 'text-orange-700 bg-orange-100 border-orange-300',
  CE: 'text-blue-700 bg-blue-100 border-blue-300',
  PENDING: 'text-slate-700 bg-slate-100 border-slate-300',
  IN_QUEUE: 'text-slate-700 bg-slate-100 border-slate-300',
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
    return <div className="p-10 text-center text-sm text-[#8a8073]">{t('submission.loading')}</div>;
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <AlertTriangle size={40} className="text-[#bfae99] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#191919]">{t('submission.loadError')}</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">
            {isInstructor
              ? t('submission.instructorTitle', 'Quản lý bài nộp & Chấm điểm')
              : t('submission.studentTitle', 'Lịch sử nộp bài')}
          </h2>
          <p className="text-xs text-[#8a8073] mt-0.5">
            {isInstructor
              ? t('submission.instructorSubtitle', 'Theo dõi, chấm điểm thủ công và chấm lại các bài nộp của học viên')
              : t('submission.studentSubtitle', 'Theo dõi kết quả chấm tự động và nhận xét từ giảng viên')}
          </p>
        </div>
        <span className="text-sm font-semibold text-[#8a8073] bg-[#f7f4eb] border border-[#e5dac9] px-3 py-1 rounded-full">
          {t('submission.resultCount', { count: filteredSubmissions.length })}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('submission.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showFilters
              ? 'bg-[#193a2b]/10 border-[#193a2b]/30 text-[#193a2b]'
              : 'bg-white border-[#e5dac9] text-[#5c5446] hover:text-[#191919]'
          }`}
        >
          <Filter size={16} /> {t('instructorStudent.filterButton', 'Bộ lọc')}{' '}
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-white border border-[#e5dac9] rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">
              {t('submission.colVerdict', 'Kết quả')}
            </label>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-1 focus:ring-[#193a2b]"
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
            <label className="block text-xs text-[#8a8073] mb-1.5 font-semibold uppercase tracking-wider">
              {t('submission.colLanguage', 'Ngôn ngữ')}
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] focus:outline-none focus:ring-1 focus:ring-[#193a2b]"
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
      <div className="bg-white border border-[#e5dac9] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5dac9] bg-[#f0ebd9]/50">
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colProblem', 'Bài tập')}
                </th>
                {isInstructor && (
                  <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                    {t('submission.colSubmitter', 'Người nộp')}
                  </th>
                )}
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colVerdict', 'Kết quả')}
                </th>
                <th className="text-center text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.instructorScoreColLabel')}
                </th>
                <th className="text-left text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colLanguage', 'Ngôn ngữ')}
                </th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colTime', 'Thời gian')}
                </th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colMemory', 'Bộ nhớ')}
                </th>
                <th className="text-right text-xs font-semibold text-[#5c5446] py-3.5 px-4 uppercase tracking-wider">
                  {t('submission.colSubmittedAt', 'Thời điểm')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-[#e5dac9]/50 hover:bg-[#f7f4eb]/60 cursor-pointer transition-colors"
                  onClick={() => handleOpenDetail(sub)}
                >
                  <td className="py-3 px-4 text-sm text-[#8a8073] font-mono" title={sub.id}>
                    #{sub.id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#191919] font-semibold">{sub.problemTitle}</td>
                  {isInstructor && (
                    <td className="py-3 px-4 text-sm text-[#5c5446]">@{sub.username}</td>
                  )}
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        verdictColors[sub.verdict] ?? 'text-gray-700 bg-gray-100 border-gray-300'
                      }`}
                    >
                      {sub.verdict}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {sub.instructorScore != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        ⭐ {sub.instructorScore}/10
                        {sub.instructorFeedback && <MessageSquare size={11} className="text-amber-700" />}
                      </span>
                    ) : (
                      <span className="text-xs text-[#8a8073]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#5c5446]">{formatLanguageName(sub.language)}</td>
                  <td className="py-3 px-4 text-sm text-[#5c5446] text-right">
                    {sub.executionTime != null ? `${sub.executionTime}ms` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#5c5446] text-right">
                    {sub.memory != null ? `${sub.memory}MB` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#8a8073] text-right">
                    {formatVNFull(sub.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSubmissions.length === 0 && (
          <div className="p-12 text-center">
            <Send size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">{t('submission.emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
}