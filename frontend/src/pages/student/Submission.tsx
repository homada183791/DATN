import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/http';
import {
  useSubmissionsQuery,
  useSubmissionDetailQuery,
  gradeSubmission,
  rejudgeSubmission,
} from '../../api/submissions';
import { formatVNFull } from '../../utils/dateTime';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Send,
  AlertTriangle,
  ExternalLink,
  Award,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react';

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

export default function Submission() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, error } = useSubmissionsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // State for Instructor grading form
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [isRejudging, setIsRejudging] = useState(false);

  // Detail query for active modal
  const { data: detailData, isLoading: isDetailLoading } = useSubmissionDetailQuery(
    selectedSubmission || undefined
  );

  const hasDocument = typeof document !== 'undefined';
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

  const selectedSub = allSubmissions.find((s) => s.id === selectedSubmission);

  const verdictColors: Record<string, string> = {
    AC: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    WA: 'text-red-800 bg-red-100 border-red-300',
    TLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    MLE: 'text-yellow-800 bg-yellow-100 border-yellow-300',
    RTE: 'text-orange-800 bg-orange-100 border-orange-300',
    CE: 'text-blue-800 bg-blue-100 border-blue-300',
    PE: 'text-pink-800 bg-pink-100 border-pink-300',
    PENDING: 'text-amber-800 bg-amber-100 border-amber-300',
    IN_QUEUE: 'text-sky-800 bg-sky-100 border-sky-300',
  };

  const verdictFullNames: Record<string, string> = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit Exceeded',
    MLE: 'Memory Limit Exceeded',
    RTE: 'Runtime Error',
    CE: 'Compilation Error',
    PE: 'Presentation Error',
    PENDING: t('submission.pending'),
    IN_QUEUE: t('submission.inQueue'),
  };

  const languages = [...new Set(allSubmissions.map((s) => s.language))];

  // Handle open modal
  const handleOpenDetail = (sub: SubmissionRow) => {
    setSelectedSubmission(sub.id);
    setGradeInput(sub.instructorScore != null ? String(sub.instructorScore) : '');
    setFeedbackInput(sub.instructorFeedback || '');
    setIsGradingOpen(false);
  };

  // Handle submit instructor grade
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const numScore = parseFloat(gradeInput);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      showToast('Điểm số phải là số hợp lệ từ 0 đến 100 hoặc 0 đến 10.', 'error');
      return;
    }

    try {
      setIsSubmittingGrade(true);
      await gradeSubmission(selectedSubmission, {
        instructor_score: numScore,
        instructor_feedback: feedbackInput.trim() || undefined,
      });

      showToast('Đã lưu điểm và nhận xét của Giảng viên thành công!', 'success');
      setIsGradingOpen(false);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', selectedSubmission] });
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu điểm chấm.', 'error');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Handle instructor rejudge
  const handleRejudge = async () => {
    if (!selectedSubmission) return;
    try {
      setIsRejudging(true);
      await rejudgeSubmission(selectedSubmission);
      showToast('Đã gửi yêu cầu chấm lại bài nộp thành công!', 'success');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', selectedSubmission] });
    } catch (err: any) {
      showToast(err.message || 'Không thể chấm lại bài nộp.', 'error');
    } finally {
      setIsRejudging(false);
    }
  };

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
          <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('nav.submission', 'Bài nộp')}</h2>
          <p className="text-xs text-[#8a8073] mt-0.5">
            {isInstructor
              ? 'Theo dõi, chấm điểm thủ công và chấm lại các bài nộp của học viên'
              : 'Theo dõi kết quả biên dịch và nhận xét từ giảng viên'}
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
              <option value="PENDING">Đang chấm</option>
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
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSub && hasDocument && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fdfcf9] border border-[#e5dac9] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e5dac9] bg-[#f7f4eb] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border ${
                    verdictColors[selectedSub.verdict] ?? 'text-gray-700 bg-gray-100 border-gray-300'
                  }`}
                >
                  {selectedSub.verdict}
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#191919] flex items-center gap-2">
                    {selectedSub.problemTitle}
                    <button
                      onClick={() => navigate(isInstructor ? `/instructor/problem/${selectedSub.problemId}` : `/student/problem/${selectedSub.problemId}`)}
                      className="text-[#8a8073] hover:text-[#193a2b] transition-colors"
                      title="Mở đề bài"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </h3>
                  <p className="text-xs text-[#8a8073]">
                    Người nộp: <span className="font-semibold text-[#5c5446]">@{selectedSub.username}</span> • Mã nộp: #{selectedSub.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isInstructor && (
                  <button
                    onClick={handleRejudge}
                    disabled={isRejudging}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    title="Chấm lại bài nộp này qua sandbox"
                  >
                    <RotateCcw size={14} className={isRejudging ? 'animate-spin' : ''} />
                    {isRejudging ? 'Đang gửi...' : 'Chấm lại'}
                  </button>
                )}
                <button
                  onClick={() => navigate(isInstructor ? `/instructor/problem/${selectedSub.problemId}` : `/student/problem/${selectedSub.problemId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#193a2b] bg-[#193a2b]/10 hover:bg-[#193a2b]/20 rounded-lg transition-colors"
                  title="Đi tới trang làm bài"
                >
                  <ExternalLink size={14} />
                  {t('submission.goToProblem', 'Đến bài')}
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 hover:bg-[#e5dac9]/50 rounded-lg text-[#8a8073] hover:text-[#191919] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">{t('submission.colLanguage', 'Ngôn ngữ')}</p>
                  <p className="text-sm text-[#191919] font-bold">{selectedSub.language}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Thời gian</p>
                  <p className="text-sm text-[#191919] font-bold flex items-center justify-center gap-1">
                    <Clock size={14} className="text-[#8a8073]" />
                    {selectedSub.executionTime != null ? `${selectedSub.executionTime}ms` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Bộ nhớ</p>
                  <p className="text-sm text-[#191919] font-bold flex items-center justify-center gap-1">
                    <Cpu size={14} className="text-[#8a8073]" />
                    {selectedSub.memory != null ? `${selectedSub.memory}MB` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">Điểm tự động</p>
                  <p className="text-sm text-[#191919] font-bold">
                    {selectedSub.score != null ? `${selectedSub.score}/100` : selectedSub.verdict === 'AC' ? '100/100' : '0/100'}
                  </p>
                </div>
              </div>

              {/* SECTION: Đánh giá & Nhận xét của Giảng viên */}
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-serif font-bold text-base">
                    <Award size={20} className="text-amber-700" />
                    <span>Đánh giá của Giảng viên</span>
                  </div>
                  {isInstructor && !isGradingOpen && (
                    <button
                      onClick={() => setIsGradingOpen(true)}
                      className="text-xs font-semibold px-3 py-1 bg-[#193a2b] text-[#f7f4eb] rounded-lg hover:bg-[#2d5a3f] transition-all flex items-center gap-1"
                    >
                      <MessageSquare size={13} />
                      {selectedSub.instructorScore != null ? 'Sửa điểm & Nhận xét' : 'Chấm điểm & Nhận xét'}
                    </button>
                  )}
                </div>

                {/* Hiển thị điểm số & Lời phê đã có */}
                {selectedSub.instructorScore != null ? (
                  <div className="space-y-2 bg-white/80 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8a8073] uppercase tracking-wider font-semibold">Điểm GV chấm:</span>
                        <span className="text-base font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                          ⭐ {selectedSub.instructorScore}/10
                        </span>
                      </div>
                      {selectedSub.gradedAt && (
                        <span className="text-xs text-[#8a8073]">Chấm lúc: {formatVNFull(selectedSub.gradedAt)}</span>
                      )}
                    </div>
                    {selectedSub.instructorFeedback && (
                      <div className="pt-2 border-t border-amber-100">
                        <p className="text-xs font-semibold text-amber-900 mb-1">Lời nhận xét sư phạm:</p>
                        <p className="text-sm text-[#4a4238] italic bg-[#faf7ee] p-3 rounded-lg border-l-4 border-amber-500 leading-relaxed">
                          "{selectedSub.instructorFeedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  !isGradingOpen && (
                    <p className="text-xs text-[#8a8073] italic">
                      Bài nộp chưa có điểm chấm thủ công hoặc nhận xét từ Giảng viên.
                    </p>
                  )
                )}

                {/* Form Giảng viên nhập điểm & nhận xét */}
                {isInstructor && isGradingOpen && (
                  <form onSubmit={handleSubmitGrade} className="bg-white p-4 rounded-xl border border-amber-300 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="sm:w-1/3">
                        <label className="block text-xs font-bold text-[#191919] mb-1">
                          Điểm số (Thang 10 hoặc 100):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          placeholder="Ví dụ: 9.5"
                          required
                          className="w-full px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] font-bold focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-[#191919] mb-1">
                          Lời nhận xét, góp ý mã nguồn:
                        </label>
                        <textarea
                          rows={2}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Nhận xét về thuật toán, phong cách code hoặc lưu ý cải thiện..."
                          className="w-full px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#e5dac9]">
                      <button
                        type="button"
                        onClick={() => setIsGradingOpen(false)}
                        className="px-3 py-1.5 text-xs text-[#5c5446] hover:bg-[#e5dac9]/50 rounded-lg transition-all"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingGrade}
                        className="px-4 py-1.5 bg-[#193a2b] hover:bg-[#2d5a3f] text-[#f7f4eb] text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {isSubmittingGrade ? 'Đang lưu...' : 'Lưu điểm & Nhận xét'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* SECTION: Chi tiết Test Cases Breakdown (LeetCode style) */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] font-serif mb-2.5 flex items-center gap-1.5">
                  <Layers size={16} className="text-[#193a2b]" />
                  Chi tiết kết quả các bộ Test
                </h4>

                {isDetailLoading ? (
                  <div className="p-6 text-center text-xs text-[#8a8073]">Đang nạp chi tiết các bộ test...</div>
                ) : detailData?.test_results && detailData.test_results.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.test_results.map((tr, idx) => {
                      const isAC = tr.status === 'ACCEPTED';
                      return (
                        <div
                          key={tr.id || idx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isAC
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-red-50/50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {isAC ? (
                                <CheckCircle2 size={16} className="text-emerald-600" />
                              ) : (
                                <XCircle size={16} className="text-red-600" />
                              )}
                              <span className="text-xs font-bold text-[#191919]">
                                Test #{tr.testcase_index + 1}
                              </span>
                              {tr.is_hidden && (
                                <span className="text-[10px] bg-[#e5dac9] text-[#5c5446] px-1.5 py-0.5 rounded font-mono">
                                  Test ẩn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`font-bold ${isAC ? 'text-emerald-700' : 'text-red-700'}`}>
                                {verdictFullNames[tr.status] || tr.status}
                              </span>
                              {tr.execution_time != null && (
                                <span className="text-[#8a8073]">{tr.execution_time}ms</span>
                              )}
                              {tr.memory_used != null && (
                                <span className="text-[#8a8073]">{tr.memory_used}MB</span>
                              )}
                            </div>
                          </div>

                          {/* Chi tiết I/O nếu không ẩn hoặc là Giảng viên */}
                          {(!tr.is_hidden || isInstructor) && (tr.input || tr.expected_output || tr.actual_output) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-black/5 text-[11px] font-mono">
                              {tr.input && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">Input:</span>
                                  <pre className="whitespace-pre-wrap break-all text-[#191919]">{tr.input}</pre>
                                </div>
                              )}
                              {tr.actual_output !== undefined && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">Output thực tế:</span>
                                  <pre className={`whitespace-pre-wrap break-all ${isAC ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {tr.actual_output || '(Rỗng)'}
                                  </pre>
                                </div>
                              )}
                              {tr.expected_output && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">Đáp án đúng:</span>
                                  <pre className="whitespace-pre-wrap break-all text-emerald-700">{tr.expected_output}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-[#e5dac9] text-xs text-[#8a8073] text-center">
                    Chưa có chi tiết test case cho bài nộp này.
                  </div>
                )}
              </div>

              {/* SECTION: Mã nguồn nộp */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] font-serif mb-2">{t('submission.sourceCode', 'Mã nguồn đã nộp')}</h4>
                <div className="bg-[#242424] border border-[#333333] rounded-xl p-4 overflow-x-auto shadow-inner">
                  <pre className="text-sm text-emerald-400 font-mono whitespace-pre">{selectedSub.code}</pre>
                </div>
              </div>

              {selectedSub.verdict !== 'AC' && selectedSub.verdict !== 'CE' && selectedSub.verdict !== 'PENDING' && selectedSub.verdict !== 'IN_QUEUE' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-700" />
                    <span className="text-sm font-bold text-red-700 font-serif">{verdictFullNames[selectedSub.verdict] || selectedSub.verdict}</span>
                  </div>
                  <p className="text-xs text-red-600 leading-relaxed">
                    {selectedSub.verdict === 'WA' && t('submission.explainWA')}
                    {selectedSub.verdict === 'TLE' && t('submission.explainTLE')}
                    {selectedSub.verdict === 'RTE' && t('submission.explainRTE')}
                  </p>
                </div>
              )}
              {(selectedSub.verdict === 'PENDING' || selectedSub.verdict === 'IN_QUEUE') && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-amber-800 font-serif">{t('submission.queueTitle')}</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t('submission.queueMessage')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
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
                  {t('submission.colProblem', 'Bài toán')}
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
                  Điểm GV chấm
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
                  <td className="py-3 px-4 text-sm text-[#5c5446]">{sub.language}</td>
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
