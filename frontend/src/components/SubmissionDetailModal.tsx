import { useEffect, useState } from 'react';
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
import { readStoredEditorPreferences, subscribeEditorPreferences } from '../utils/editorPreferences';
import CodeEditor from './CodeEditor';
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
  Star,
} from 'lucide-react';
import { formatLanguageName, getLanguageConfig } from '../config/languages';

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
  const [editorPreferences, setEditorPreferences] = useState(() =>
    readStoredEditorPreferences(user?.preferences as Record<string, unknown> | undefined),
  );

  useEffect(() => {
    setEditorPreferences(
      readStoredEditorPreferences(user?.preferences as Record<string, unknown> | undefined),
    );
    return subscribeEditorPreferences(setEditorPreferences);
  }, [user?.preferences]);

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
    AC: 'text-(--ws-ok) bg-(--ws-ok-soft) border-(--ws-ok)/35',
    WA: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    TLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    MLE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    RTE: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    CE: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
    PE: 'text-(--ws-danger) bg-(--ws-danger-soft) border-(--ws-danger)/35',
    PENDING: 'text-(--ws-warn) bg-(--ws-warn-soft) border-(--ws-warn)/35',
    IN_QUEUE: 'text-(--ws-info) bg-(--ws-info-soft) border-(--ws-info)/35',
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
            <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl px-8 py-6 text-sm text-(--ws-muted)">
              {t('submission.loading')}
            </div>
          </div>,
          document.body,
        );
  }

  return createPortal(
        <div className="fixed inset-0 z-110 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-(--ws-border) bg-(--ws-panel2) flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border ${
                    verdictColors[selectedSub.verdict] ?? 'text-(--ws-text) bg-(--ws-panel2) border-(--ws-border)'
                  }`}
                >
                  {selectedSub.verdict}
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-(--ws-text) flex items-center gap-2">
                    {selectedSub.problemTitle}
                    <button
                      onClick={() => navigate(isInstructor ? `/instructor/problem/${selectedSub.problemId}` : `/student/problem/${selectedSub.problemId}`)}
                      className="text-(--ws-muted) hover:text-(--ws-accent) transition-colors"
                      title={t('submission.openStatementTooltip')}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </h3>
                  <p className="text-xs text-(--ws-muted)">
                    {isInstructor && (
                      <>
                        {t('submission.submitterLabel')} <span className="font-semibold text-(--ws-text)">{usernameOverride ?? `@${selectedSub.username}`}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isInstructor && !hideProblemActions && (
                  <button
                    onClick={handleRejudge}
                    disabled={isRejudging}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-warn-soft) hover:bg-(--ws-warn-soft) border border-(--ws-warn)/35 text-(--ws-warn) rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    title={t('submission.rejudgeTooltip')}
                  >
                    <RotateCcw size={14} className={isRejudging ? 'animate-spin' : ''} />
                    {isRejudging ? t('submission.rejudgingLabel') : t('submission.rejudgeBtn')}
                  </button>
                )}
                {isInstructor && !hideProblemActions && (
                  <button
                    onClick={() => navigate(`/instructor/problem/${selectedSub.problemId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-(--ws-accent) bg-(--ws-accent)/10 hover:bg-(--ws-accent)/20 rounded-lg transition-colors"
                    title={t('submission.goToProblem')}
                  >
                    <ExternalLink size={14} />
                    {t('submission.goToProblem', 'Đến bài')}
                  </button>
                )}
                <button aria-label={t('common.close')}
                  onClick={onClose}
                  className="p-1.5 hover:bg-(--ws-hover)/50 rounded-lg text-(--ws-muted) hover:text-(--ws-text) transition-colors"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <p className="text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">{t('submission.colLanguage', 'Ngôn ngữ')}</p>
                  <p className="text-sm text-(--ws-text) font-bold">{formatLanguageName(selectedSub.language)}</p>
                </div>
                <div className="p-3 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <p className="text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">{t('submission.colTime')}</p>
                  <p className="text-sm text-(--ws-text) font-bold flex items-center justify-center gap-1">
                    <Clock size={14} className="text-(--ws-muted)" />
                    {selectedSub.executionTime != null ? `${selectedSub.executionTime}ms` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <p className="text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">{t('submission.colMemory')}</p>
                  <p className="text-sm text-(--ws-text) font-bold flex items-center justify-center gap-1">
                    <Cpu size={14} className="text-(--ws-muted)" />
                    {selectedSub.memory != null ? `${selectedSub.memory}MB` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-center shadow-sm">
                  <p className="text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">{t('submission.autoScoreLabel')}</p>
                  <p className="text-sm text-(--ws-text) font-bold">
                    {selectedSub.score != null ? `${selectedSub.score}/100` : selectedSub.verdict === 'AC' ? '100/100' : '0/100'}
                  </p>
                </div>
              </div>

              {/* SECTION: Đánh giá & Nhận xét của Giảng viên */}
              <div className="p-5 rounded-2xl bg-(--ws-warn-soft)/70 border border-(--ws-warn)/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-(--ws-warn) font-serif font-bold text-base">
                    <Award size={20} className="text-(--ws-warn)" />
                    <span>{t('submission.instructorReviewTitle')}</span>
                  </div>
                  {isInstructor && !isGradingOpen && (
                    <button
                      onClick={() => setIsGradingOpen(true)}
                      className="text-xs font-semibold px-3 py-1 bg-(--ws-accent) text-(--ws-panel) rounded-lg hover:bg-(--ws-accent) transition-all flex items-center gap-1"
                    >
                      <MessageSquare size={13} />
                      {selectedSub.instructorScore != null ? t('submission.editGradeBtn') : t('submission.gradeBtn')}
                    </button>
                  )}
                </div>

                {/* Hiển thị điểm số & Lời phê đã có */}
                {selectedSub.instructorScore != null ? (
                  <div className="space-y-2 bg-(--ws-panel)/80 p-4 rounded-xl border border-(--ws-warn)/35">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-(--ws-muted) uppercase tracking-wider font-semibold">{t('submission.instructorGradedScoreLabel')}</span>
                        <span className="text-base font-bold text-(--ws-warn) bg-(--ws-warn-soft) px-2.5 py-0.5 rounded-lg border border-(--ws-warn)/35">
                          <Star size={13} className="inline-block align-[-2px] mr-1 fill-current" aria-hidden="true" />{selectedSub.instructorScore}/{scoreMax}
                        </span>
                      </div>
                      {selectedSub.gradedAt && (
                        <span className="text-xs text-(--ws-muted)">{t('submission.gradedAtLabel')} {formatVNFull(selectedSub.gradedAt)}</span>
                      )}
                    </div>
                    {selectedSub.instructorFeedback && (
                      <div className="pt-2 border-t border-(--ws-warn)/35">
                        <p className="text-xs font-semibold text-(--ws-warn) mb-1">{t('submission.pedagogicalFeedbackLabel')}</p>
                        <p className="text-sm text-(--ws-muted) italic bg-(--ws-panel) p-3 rounded-lg border-l-4 border-(--ws-warn) leading-relaxed">
                          "{selectedSub.instructorFeedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  !isGradingOpen && (
                    <p className="text-xs text-(--ws-muted) italic">
                      {t('submission.noGradeYetMessage')}
                    </p>
                  )
                )}

                {/* Form Giảng viên nhập điểm & nhận xét */}
                {isInstructor && isGradingOpen && (
                  <form onSubmit={handleSubmitGrade} className="bg-(--ws-panel) p-4 rounded-xl border border-(--ws-warn)/35 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="sm:w-1/3">
                        <label className="block text-xs font-bold text-(--ws-text) mb-1">
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
                          className="w-full px-3 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) font-bold focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-(--ws-text) mb-1">
                          {t('submission.feedbackInputLabel')}
                        </label>
                        <textarea
                          rows={2}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder={t('submission.feedbackPlaceholder')}
                          className="w-full px-3 py-2 bg-(--ws-panel2) border border-(--ws-border) rounded-lg text-sm text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-(--ws-border)">
                      <button
                        type="button"
                        onClick={() => setIsGradingOpen(false)}
                        className="px-3 py-1.5 text-xs text-(--ws-text) hover:bg-(--ws-hover)/50 rounded-lg transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingGrade}
                        className="px-4 py-1.5 bg-(--ws-accent) hover:bg-(--ws-accent) text-(--ws-panel) text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {isSubmittingGrade ? t('submission.savingLabel') : t('submission.saveGradeBtn')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* SECTION: Chi tiết Test Cases Breakdown (LeetCode style) */}
              <div>
                <h4 className="text-sm font-bold text-(--ws-text) font-serif mb-2.5 flex items-center gap-1.5">
                  <Layers size={16} className="text-(--ws-accent)" />
                  {t('submission.testBreakdownTitle')}
                </h4>

                {isDetailLoading ? (
                  <div className="p-6 text-center text-xs text-(--ws-muted)">{t('submission.loadingTestDetails')}</div>
                ) : detailData?.test_results && detailData.test_results.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.test_results.map((tr, idx) => {
                      const isAC = tr.status === 'ACCEPTED';
                      return (
                        <div
                          key={tr.id || idx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isAC
                              ? 'bg-(--ws-ok-soft)/50 border-(--ws-ok)/35'
                              : 'bg-(--ws-danger-soft)/50 border-(--ws-danger)/35'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {isAC ? (
                                <CheckCircle2 size={16} className="text-(--ws-ok)" />
                              ) : (
                                <XCircle size={16} className="text-(--ws-danger)" />
                              )}
                              <span className="text-xs font-bold text-(--ws-text)">
                                {t('submission.testNumberLabel', { number: tr.testcase_index + 1 })}
                              </span>
                              {tr.is_hidden && (
                                <span className="text-[10px] bg-(--ws-border) text-(--ws-text) px-1.5 py-0.5 rounded font-mono">
                                  {t('submission.hiddenTestLabel')}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-[9rem_5rem_4rem] items-center gap-3 text-xs text-right">
                              <span className={`font-bold ${isAC ? 'text-(--ws-ok)' : 'text-(--ws-danger)'}`}>
                                {verdictFullNames[tr.status] || tr.status}
                              </span>
                              <span className="text-(--ws-muted) tabular-nums">
                                {tr.execution_time != null ? `${tr.execution_time}ms` : ''}
                              </span>
                              <span className="text-(--ws-muted) tabular-nums">
                                {tr.memory_used != null ? `${tr.memory_used}MB` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Chi tiết I/O chỉ dành cho Giảng viên; sinh viên chỉ thấy kết quả từng bộ test */}
                          {isInstructor && (tr.input || tr.expected_output || tr.actual_output) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-black/5 text-[11px] font-mono">
                              {tr.input && (
                                <div className="bg-(--ws-panel)/80 p-2 rounded border border-(--ws-border)/60">
                                  <span className="text-(--ws-muted) block mb-0.5 font-bold uppercase text-[9px]">{t('submission.inputLabel')}</span>
                                  <pre className="whitespace-pre-wrap break-all text-(--ws-text)">{tr.input}</pre>
                                </div>
                              )}
                              {tr.actual_output !== undefined && (
                                <div className="bg-(--ws-panel)/80 p-2 rounded border border-(--ws-border)/60">
                                  <span className="text-(--ws-muted) block mb-0.5 font-bold uppercase text-[9px]">{t('submission.actualOutputLabel')}</span>
                                  <pre className={`whitespace-pre-wrap break-all ${isAC ? 'text-(--ws-ok)' : 'text-(--ws-danger)'}`}>
                                    {tr.actual_output || t('submission.emptyOutputLabel')}
                                  </pre>
                                </div>
                              )}
                              {tr.expected_output && (
                                <div className="bg-(--ws-panel)/80 p-2 rounded border border-(--ws-border)/60">
                                  <span className="text-(--ws-muted) block mb-0.5 font-bold uppercase text-[9px]">{t('submission.expectedOutputLabel')}</span>
                                  <pre className="whitespace-pre-wrap break-all text-(--ws-ok)">{tr.expected_output}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border) text-xs text-(--ws-muted) text-center">
                    {t('submission.noTestDetailsMessage')}
                  </div>
                )}
              </div>

              {/* SECTION: Mã nguồn nộp */}
              <div>
                <h4 className="text-sm font-bold text-(--ws-text) font-serif mb-2">{t('submission.sourceCode', 'Mã nguồn đã nộp')}</h4>
                <div className="h-96 border border-(--ws-border) rounded-xl overflow-hidden shadow-inner">
                  <CodeEditor
                    value={selectedSub.code}
                    onChange={() => {}}
                    language={getLanguageConfig(selectedSub.language).monacoLang}
                    fontSize={editorPreferences.fontSize}
                    tabSize={editorPreferences.tabSize}
                    editorTheme={editorPreferences.editorTheme}
                    wordWrap={false}
                    suggestions={false}
                    readOnly
                    diagnostics={[]}
                    ariaLabel={t('submission.sourceCode', 'Mã nguồn đã nộp')}
                  />
                </div>
              </div>

              {selectedSub.verdict !== 'AC' && selectedSub.verdict !== 'CE' && selectedSub.verdict !== 'PENDING' && selectedSub.verdict !== 'IN_QUEUE' && (
                <div className="p-4 bg-(--ws-danger-soft) border border-(--ws-danger)/35 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-(--ws-danger)" />
                    <span className="text-sm font-bold text-(--ws-danger) font-serif">{verdictFullNames[selectedSub.verdict] || selectedSub.verdict}</span>
                  </div>
                  <p className="text-xs text-(--ws-danger) leading-relaxed">
                    {selectedSub.verdict === 'WA' && t('submission.explainWA')}
                    {selectedSub.verdict === 'TLE' && t('submission.explainTLE')}
                    {selectedSub.verdict === 'RTE' && t('submission.explainRTE')}
                  </p>
                </div>
              )}
              {(selectedSub.verdict === 'PENDING' || selectedSub.verdict === 'IN_QUEUE') && (
                <div className="p-4 bg-(--ws-warn-soft) border border-(--ws-warn)/35 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-(--ws-warn) font-serif">{t('submission.queueTitle')}</span>
                  </div>
                  <p className="text-xs text-(--ws-warn) leading-relaxed">
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