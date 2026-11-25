import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useSubmissionDetailQuery,
  gradeSubmission,
  rejudgeSubmission,
} from '../api/submissions';
import { formatVNFull } from '../utils/dateTime';
import {
  X,
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
import { formatLanguageName } from '../config/languages';

const verdictByStatus: Record<string, string> = {
  PENDING: 'PENDING',
  IN_QUEUE: 'IN_QUEUE',
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  COMPILE_ERROR: 'CE',
  RUNTIME_ERROR: 'RTE',
};

interface SubmissionDetailModalProps {
  submissionId: string;
  onClose: () => void;
  /** Tên hiển thị ở dòng "Người nộp" (mặc định: @username của bài nộp) */
  usernameOverride?: string;
  /** Ẩn hai nút "Chấm lại" và "Đi đến bài tập" ở góc phải (dùng khi xem từ kết quả kỳ thi); biểu tượng mở đề cạnh tên bài vẫn giữ */
  hideProblemActions?: boolean;
  /** Thang điểm hiển thị cho điểm giảng viên chấm (mặc định /10) */
  scoreMax?: number;
  /** Điểm tối đa được phép nhập khi chấm (mặc định 100; bài tập lớp dùng thang 10) */
  gradeMax?: number;
  /** Gọi sau khi giảng viên lưu điểm thành công */
  onGraded?: () => void;
}

export default function SubmissionDetailModal({
  submissionId,
  onClose,
  usernameOverride,
  hideProblemActions = false,
  scoreMax = 10,
  gradeMax = 100,
  onGraded,
}: SubmissionDetailModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isInstructor = user?.role === 'instructor';

  const { data: detailData, isLoading: isDetailLoading } = useSubmissionDetailQuery(submissionId);

  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [isRejudging, setIsRejudging] = useState(false);

  const selectedSub = detailData
    ? {
        id: detailData.id,
        problemId: detailData.problem_id,
        problemTitle: detailData.problem_title,
        username: detailData.username,
        language: detailData.language,
        verdict: verdictByStatus[detailData.status] ?? detailData.status,
        score: detailData.score,
        instructorScore: detailData.instructor_score,
        instructorFeedback: detailData.instructor_feedback,
        gradedAt: detailData.graded_at,
        executionTime: detailData.execution_time,
        memory: detailData.memory_used,
        code: detailData.source_code,
      }
    : null;

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

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseFloat(gradeInput);
    if (isNaN(numScore) || numScore < 0 || numScore > gradeMax) {
      showToast(t('submission.gradeRangeError', { max: gradeMax }), 'error');
      return;
    }

    try {
      setIsSubmittingGrade(true);
      await gradeSubmission(submissionId, {
        instructor_score: numScore,
        instructor_feedback: feedbackInput.trim() || undefined,
      });

      showToast(t('submission.gradeSavedSuccess'), 'success');
      setIsGradingOpen(false);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      onGraded?.();
    } catch (err: any) {
      showToast(err.message || t('submission.saveGradeFailed'), 'error');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleRejudge = async () => {
    try {
      setIsRejudging(true);
      await rejudgeSubmission(submissionId);
      showToast(t('submission.rejudgeSentSuccess'), 'success');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    } catch (err: any) {
      showToast(err.message || t('submission.rejudgeFailed'), 'error');
    } finally {
      setIsRejudging(false);
    }
  };

  // Điền sẵn điểm/nhận xét đã chấm mỗi khi dữ liệu bài nộp được tải/cập nhật
  const gradeKey = `${detailData?.id ?? ''}|${detailData?.instructor_score ?? ''}|${detailData?.instructor_feedback ?? ''}`;
  const [syncedKey, setSyncedKey] = useState('');
  if (detailData && syncedKey !== gradeKey) {
    setSyncedKey(gradeKey);
    setGradeInput(detailData.instructor_score != null ? String(detailData.instructor_score) : '');
    setFeedbackInput(detailData.instructor_feedback || '');
  }

  if (!selectedSub || typeof document === 'undefined') {
    // Đang tải: hiện khung chờ nhỏ cùng lớp phủ
    return typeof document === 'undefined'
      ? null
      : createPortal(
          <div className="fixed inset-0 z-110 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#fdfcf9] border border-[#e5dac9] rounded-2xl px-8 py-6 text-sm text-[#8a8073]">
              {t('submission.loading')}
            </div>
          </div>,
          document.body,
        );
  }

  return createPortal(
        <div className="fixed inset-0 z-110 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                      title={t('submission.openStatementTooltip')}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </h3>
                  <p className="text-xs text-[#8a8073]">
                    {isInstructor && (
                      <>
                        {t('submission.submitterLabel')} <span className="font-semibold text-[#5c5446]">{usernameOverride ?? `@${selectedSub.username}`}</span> •{' '}
                      </>
                    )}
                    {t('submission.submissionIdLabel')} #{selectedSub.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isInstructor && !hideProblemActions && (
                  <button
                    onClick={handleRejudge}
                    disabled={isRejudging}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    title={t('submission.rejudgeTooltip')}
                  >
                    <RotateCcw size={14} className={isRejudging ? 'animate-spin' : ''} />
                    {isRejudging ? t('submission.rejudgingLabel') : t('submission.rejudgeBtn')}
                  </button>
                )}
                {isInstructor && !hideProblemActions && (
                  <button
                    onClick={() => navigate(`/instructor/problem/${selectedSub.problemId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#193a2b] bg-[#193a2b]/10 hover:bg-[#193a2b]/20 rounded-lg transition-colors"
                    title={t('submission.goToProblem')}
                  >
                    <ExternalLink size={14} />
                    {t('submission.goToProblem', 'Đến bài')}
                  </button>
                )}
                <button
                  onClick={onClose}
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
                  <p className="text-sm text-[#191919] font-bold">{formatLanguageName(selectedSub.language)}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">{t('submission.colTime')}</p>
                  <p className="text-sm text-[#191919] font-bold flex items-center justify-center gap-1">
                    <Clock size={14} className="text-[#8a8073]" />
                    {selectedSub.executionTime != null ? `${selectedSub.executionTime}ms` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">{t('submission.colMemory')}</p>
                  <p className="text-sm text-[#191919] font-bold flex items-center justify-center gap-1">
                    <Cpu size={14} className="text-[#8a8073]" />
                    {selectedSub.memory != null ? `${selectedSub.memory}MB` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#e5dac9] text-center shadow-sm">
                  <p className="text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">{t('submission.autoScoreLabel')}</p>
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
                    <span>{t('submission.instructorReviewTitle')}</span>
                  </div>
                  {isInstructor && !isGradingOpen && (
                    <button
                      onClick={() => setIsGradingOpen(true)}
                      className="text-xs font-semibold px-3 py-1 bg-[#193a2b] text-[#f7f4eb] rounded-lg hover:bg-[#2d5a3f] transition-all flex items-center gap-1"
                    >
                      <MessageSquare size={13} />
                      {selectedSub.instructorScore != null ? t('submission.editGradeBtn') : t('submission.gradeBtn')}
                    </button>
                  )}
                </div>

                {/* Hiển thị điểm số & Lời phê đã có */}
                {selectedSub.instructorScore != null ? (
                  <div className="space-y-2 bg-white/80 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8a8073] uppercase tracking-wider font-semibold">{t('submission.instructorGradedScoreLabel')}</span>
                        <span className="text-base font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                          ⭐ {selectedSub.instructorScore}/{scoreMax}
                        </span>
                      </div>
                      {selectedSub.gradedAt && (
                        <span className="text-xs text-[#8a8073]">{t('submission.gradedAtLabel')} {formatVNFull(selectedSub.gradedAt)}</span>
                      )}
                    </div>
                    {selectedSub.instructorFeedback && (
                      <div className="pt-2 border-t border-amber-100">
                        <p className="text-xs font-semibold text-amber-900 mb-1">{t('submission.pedagogicalFeedbackLabel')}</p>
                        <p className="text-sm text-[#4a4238] italic bg-[#faf7ee] p-3 rounded-lg border-l-4 border-amber-500 leading-relaxed">
                          "{selectedSub.instructorFeedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  !isGradingOpen && (
                    <p className="text-xs text-[#8a8073] italic">
                      {t('submission.noGradeYetMessage')}
                    </p>
                  )
                )}

                {/* Form Giảng viên nhập điểm & nhận xét */}
                {isInstructor && isGradingOpen && (
                  <form onSubmit={handleSubmitGrade} className="bg-white p-4 rounded-xl border border-amber-300 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="sm:w-1/3">
                        <label className="block text-xs font-bold text-[#191919] mb-1">
                          {t('submission.scoreInputLabel')}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={gradeMax}
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          placeholder={t('submission.scorePlaceholder')}
                          required
                          className="w-full px-3 py-2 bg-[#f7f4eb] border border-[#e5dac9] rounded-lg text-sm text-[#191919] font-bold focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-[#191919] mb-1">
                          {t('submission.feedbackInputLabel')}
                        </label>
                        <textarea
                          rows={2}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder={t('submission.feedbackPlaceholder')}
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
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingGrade}
                        className="px-4 py-1.5 bg-[#193a2b] hover:bg-[#2d5a3f] text-[#f7f4eb] text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {isSubmittingGrade ? t('submission.savingLabel') : t('submission.saveGradeBtn')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* SECTION: Chi tiết Test Cases Breakdown (LeetCode style) */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] font-serif mb-2.5 flex items-center gap-1.5">
                  <Layers size={16} className="text-[#193a2b]" />
                  {t('submission.testBreakdownTitle')}
                </h4>

                {isDetailLoading ? (
                  <div className="p-6 text-center text-xs text-[#8a8073]">{t('submission.loadingTestDetails')}</div>
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
                                {t('submission.testNumberLabel', { number: tr.testcase_index + 1 })}
                              </span>
                              {tr.is_hidden && (
                                <span className="text-[10px] bg-[#e5dac9] text-[#5c5446] px-1.5 py-0.5 rounded font-mono">
                                  {t('submission.hiddenTestLabel')}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-[9rem_5rem_4rem] items-center gap-3 text-xs text-right">
                              <span className={`font-bold ${isAC ? 'text-emerald-700' : 'text-red-700'}`}>
                                {verdictFullNames[tr.status] || tr.status}
                              </span>
                              <span className="text-[#8a8073] tabular-nums">
                                {tr.execution_time != null ? `${tr.execution_time}ms` : ''}
                              </span>
                              <span className="text-[#8a8073] tabular-nums">
                                {tr.memory_used != null ? `${tr.memory_used}MB` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Chi tiết I/O chỉ dành cho Giảng viên; sinh viên chỉ thấy kết quả từng bộ test */}
                          {isInstructor && (tr.input || tr.expected_output || tr.actual_output) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-black/5 text-[11px] font-mono">
                              {tr.input && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">{t('submission.inputLabel')}</span>
                                  <pre className="whitespace-pre-wrap break-all text-[#191919]">{tr.input}</pre>
                                </div>
                              )}
                              {tr.actual_output !== undefined && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">{t('submission.actualOutputLabel')}</span>
                                  <pre className={`whitespace-pre-wrap break-all ${isAC ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {tr.actual_output || t('submission.emptyOutputLabel')}
                                  </pre>
                                </div>
                              )}
                              {tr.expected_output && (
                                <div className="bg-white/80 p-2 rounded border border-[#e5dac9]/60">
                                  <span className="text-[#8a8073] block mb-0.5 font-bold uppercase text-[9px]">{t('submission.expectedOutputLabel')}</span>
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
                    {t('submission.noTestDetailsMessage')}
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
    document.body,
  );
}