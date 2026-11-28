import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ContestMonitor from '../../components/ContestMonitor';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContest, deleteContest, updateContest,
  useContestsQuery, useLeaderboardQuery,
  addProblemToContest, removeProblemFromContest, fetchContestDetail,
  type ContestDto, fetchContestResults, type ContestResultsDto,
} from '../../api/contests';
import { useClassesQuery } from '../../api/classes';
import SubmissionDetailModal from '../../components/SubmissionDetailModal';
import { useProblemsQuery, createProblem, type CreateProblemDto, type ProblemDto } from '../../api/problems';
import ProblemFormModal from '../../components/ProblemFormModal';
import { ApiError } from '../../api/http';
import { notifyGlobalToast } from '../../context/ToastContext';
import { toDatetimeLocal, datetimeLocalToISO, formatVNFull } from '../../utils/dateTime';
import {
  Trophy, Users, Plus, Search, X, Calendar, Edit3, Trash2, Eye,
  Lock, Globe, BookOpen, CheckCircle2, ShieldAlert, Loader2, RefreshCw, Minus, Download, FileText,
} from 'lucide-react';

type ContestForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  visibility: 'public' | 'private';
  classId: string;
  maxCheatWarnings: string;
  lockdownEnabled: boolean;
  lockdownCode: string;
};

/** Mã giám thị ngẫu nhiên (bỏ ký tự dễ nhầm 0/O, 1/I) */
const generateLockdownCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const emptyContestForm: ContestForm = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  visibility: 'public',
  classId: '',
  maxCheatWarnings: '3',
  lockdownEnabled: false,
  lockdownCode: '',
};

export default function InstructorContest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [showProblemManager, setShowProblemManager] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeSaving, setComposeSaving] = useState(false);
  const [form, setForm] = useState<ContestForm>(emptyContestForm);
  const [editingContest, setEditingContest] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasDocument = typeof document !== 'undefined';
  const { data: contestsData } = useContestsQuery();

  // Trạng thái kỳ thi tính theo giờ hiện tại ở trình duyệt, tự cập nhật đúng thời điểm bắt đầu/kết thúc
  // (không cần tải lại trang).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const boundaries = (contestsData ?? [])
      .flatMap((c) => [new Date(c.startTime).getTime(), new Date(c.endTime).getTime()])
      .filter((ts) => Number.isFinite(ts) && ts > now);
    if (boundaries.length === 0) return;
    const delay = Math.min(Math.min(...boundaries) - now + 200, 2147483000);
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [contestsData, now]);
  const contests = useMemo(
    () =>
      (contestsData ?? []).map((c): ContestDto => {
        const start = new Date(c.startTime).getTime();
        const end = new Date(c.endTime).getTime();
        const status: ContestDto['status'] = now < start ? 'upcoming' : now <= end ? 'running' : 'ended';
        return { ...c, status };
      }),
    [contestsData, now],
  );
  const { data: leaderboard = [] } = useLeaderboardQuery(selectedContest ?? undefined);
  const { data: classes = [] } = useClassesQuery();
  const { data: bankProblems = [] } = useProblemsQuery();

  // ── Contest problem manager state ────────────────────────────────────────
  const [contestProblems, setContestProblems] = useState<Array<{ problem_id: string; problem: { id: string; title: string; difficulty: string } }>>([]);
  const [loadingContestProblems, setLoadingContestProblems] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [addingProblemId, setAddingProblemId] = useState<string | null>(null);

  // ── Giám sát kỳ thi & ELO state ─────────────────────────────────────────
  const [showMonitorModal, setShowMonitorModal] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<ContestResultsDto | null>(null);
  const [viewCode, setViewCode] = useState<{ submissionId: string; student: string; problem: string } | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const monitorStatus = contests.find((c) => c.id === showMonitorModal)?.status;

  const openCreate = () => {
    setEditingContest(null);
    setForm(emptyContestForm);
    setShowCreateModal(true);
  };

  const openEdit = (contest: (typeof contests)[number]) => {
    setEditingContest(contest.id);
    setForm({
      title: contest.title,
      description: contest.description ?? '',
      // Use toDatetimeLocal to correctly convert ISO → datetime-local without UTC drift
      startTime: contest.startTime ? toDatetimeLocal(contest.startTime) : '',
      endTime: contest.endTime ? toDatetimeLocal(contest.endTime) : '',
      visibility: contest.visibility ?? 'public',
      classId: contest.classId ?? '',
      maxCheatWarnings: String(contest.maxCheatWarnings ?? 3),
      lockdownEnabled: contest.lockdownEnabled ?? false,
      lockdownCode: contest.lockdownCode ?? '',
    });
    setShowCreateModal(true);
  };

  const openProblemManager = async (contestId: string) => {
    setShowProblemManager(contestId);
    setLoadingContestProblems(true);
    setProblemSearch('');
    try {
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
    } catch {
      setContestProblems([]);
    } finally {
      setLoadingContestProblems(false);
    }
  };

  const handleAddProblem = async (contestId: string, problemId: string) => {
    setAddingProblemId(problemId);
    try {
      await addProblemToContest(contestId, problemId);
      // Reload contest problems
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      notifyGlobalToast(t('instructorContest.success.problemAdded'), 'success');
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.errors.addProblemFailed'));
    } finally {
      setAddingProblemId(null);
    }
  };

  // Soạn mới / tải tệp: bài chỉ thuộc kỳ thi (in_bank = false), không đưa vào Ngân hàng bài tập
  const handleComposeSubmit = async (data: CreateProblemDto) => {
    const contestId = showProblemManager;
    if (!contestId) return;
    setComposeSaving(true);
    try {
      const created = await createProblem({ ...data, in_bank: false });
      await addProblemToContest(contestId, created.id);
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      notifyGlobalToast(t('instructorContest.success.problemAdded'), 'success');
      setShowCompose(false);
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.errors.addProblemFailed'));
    } finally {
      setComposeSaving(false);
    }
  };

  const handleImportedProblems = async (items: Array<{ created: ProblemDto; dto: CreateProblemDto }>) => {
    const contestId = showProblemManager;
    if (!contestId) return;
    let failed = 0;
    for (const { created } of items) {
      try {
        await addProblemToContest(contestId, created.id);
      } catch {
        failed++;
      }
    }
    try {
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
    } catch { /* bỏ qua */ }
    setShowCompose(false);
    if (failed > 0) notifyGlobalToast(t('instructorContest.errors.addProblemFailed'));
    else notifyGlobalToast(t('instructorContest.success.problemAdded'), 'success');
  };

  const handleRemoveProblem = async (contestId: string, problemId: string) => {
    try {
      await removeProblemFromContest(contestId, problemId);
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      notifyGlobalToast(t('instructorContest.success.problemRemoved'), 'success');
    } catch (err) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.errors.removeProblemFailed'));
    }
  };

  // Mở bảng kết quả thi chi tiết
  useEffect(() => {
    const contestId = showResultsModal;
    if (!contestId) return;
    let cancelled = false;
    setLoadingResults(true);
    setResultsData(null);
    fetchContestResults(contestId)
      .then((res) => { if (!cancelled) setResultsData(res); })
      .catch((err) => {
        notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.loadResultsFailed'));
      })
      .finally(() => { if (!cancelled) setLoadingResults(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResultsModal]);

  // Danh sách kết quả: sắp theo tên thí sinh (A → Z)
  const sortedResults = resultsData
    ? [...resultsData.results].sort((x, y) => x.username.localeCompare(y.username, 'vi', { sensitivity: 'base' }))
    : [];
  // Ghi chú: chỉ có ở chế độ giám sát (rời màn hình / chuyển tab)
  const resultNote = (r: ContestResultsDto['results'][number]) => {
    if (!resultsData || resultsData.contest.lockdown_enabled) return '';
    if (r.is_disqualified) return t('instructorContest.noteDisqualified', { count: r.cheat_warnings });
    if (r.cheat_warnings > 0) return t('instructorContest.noteLeftScreen', { count: r.cheat_warnings });
    return '';
  };

  // Xuất kết quả thi ra file .csv (có BOM để Excel đọc đúng tiếng Việt)
  const exportResultsCsv = () => {
    if (!resultsData) return;
    const esc = (value: string | number | null | undefined) => {
      let text = value === null || value === undefined ? '' : String(value);
      // Tránh bị Excel hiểu là công thức
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const header = [
      t('instructorContest.resultsColNo'),
      t('instructorContest.colUser'),
      ...resultsData.problems.map((p) => p.title),
      t('instructorContest.resultsColTotal'),
      t('instructorContest.resultsColNote'),
    ];
    const rows = sortedResults.map((r, index) => [
      index + 1,
      r.username,
      ...resultsData.problems.map((p) => r.problems[p.id]?.score ?? 0),
      r.score,
      resultNote(r),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((line) => line.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = resultsData.contest.title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'contest';
    link.href = url;
    link.download = `ket-qua-thi_${safeTitle}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };


  const saveContest = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      notifyGlobalToast(t('instructorContest.errors.missingFields'));
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      notifyGlobalToast(t('instructorContest.errors.endBeforeStart'));
      return;
    }
    if (form.visibility === 'private' && !form.classId) {
      notifyGlobalToast(t('instructorContest.errors.privateClassRequired'));
      return;
    }

    const maxWarnings = Number(form.maxCheatWarnings);
    if (!Number.isInteger(maxWarnings) || maxWarnings < 1 || maxWarnings > 20) {
      notifyGlobalToast(t('instructorContest.errors.maxWarningsInvalid'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        // Convert datetime-local (UTC+7 local) to ISO for backend
        start_time: datetimeLocalToISO(form.startTime),
        end_time: datetimeLocalToISO(form.endTime),
        is_private: form.visibility === 'private',
        max_cheat_warnings: maxWarnings,
        lockdown_enabled: form.lockdownEnabled,
        ...(form.lockdownEnabled ? { lockdown_code: form.lockdownCode || generateLockdownCode() } : {}),
        ...(form.visibility === 'private' ? { class_id: form.classId } : { class_id: undefined }),
      };
      if (editingContest) await updateContest(editingContest, payload);
      else await createContest(payload);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      setShowCreateModal(false);
      setSelectedContest(null);
      notifyGlobalToast(editingContest ? t('instructorContest.success.contestUpdated') : t('instructorContest.success.contestCreated'), 'success');
    } catch (error) {
      notifyGlobalToast(error instanceof ApiError ? error.message : t('instructorContest.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const removeContest = async (id: string) => {
    if (!window.confirm(t('instructorContest.confirmDeleteContest'))) return;
    try {
      await deleteContest(id);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      setSelectedContest(null);
      notifyGlobalToast(t('instructorContest.success.contestDeleted'), 'success');
    } catch (error) {
      notifyGlobalToast(error instanceof ApiError ? error.message : t('instructorContest.errors.deleteFailed'));
    }
  };

  const filteredContests = contests.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedContestData = contests.find((c) => c.id === selectedContest);

  const statusColors: Record<string, string> = {
    upcoming: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
    running: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
    ended: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)',
  };

  const statusLabels: Record<string, string> = {
    upcoming: t('instructorContest.statusUpcoming'),
    running: t('instructorContest.statusRunning'),
    ended: t('instructorContest.statusEnded'),
  };

  // Leaderboard is now always an array from BE
  const standings = Array.isArray(leaderboard) ? leaderboard : [];

  // Problems in bank not yet added to the selected contest
  const currentContestProblemIds = new Set(contestProblems.map((cp) => cp.problem_id));
  const availableProblems = bankProblems.filter(
    (p) => !currentContestProblemIds.has(p.id) &&
      (problemSearch === '' || p.title.toLowerCase().includes(problemSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('instructorContest.pageTitle')}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-all shadow-md"
        >
          <Plus size={18} /> {t('instructorContest.createNew')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-(--ws-warn)">{contests.filter((c) => c.status === 'upcoming').length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.statUpcoming')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-(--ws-ok)">{contests.filter((c) => c.status === 'running').length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.statRunning')}</p>
        </div>
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-(--ws-muted)">{contests.filter((c) => c.status === 'ended').length}</p>
          <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.statEnded')}</p>
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
            placeholder={t('instructorContest.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-(--ws-panel) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((f) => (
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

      {/* ── Contest Detail Modal ──────────────────────────────────────────── */}
      {selectedContest && selectedContestData && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">{selectedContestData.title}{selectedContestData.visibility === 'private' && selectedContestData.classLabel && (<span className="ml-2 align-middle text-xs font-semibold text-(--ws-muted) bg-(--ws-editor) border border-(--ws-border) rounded-full px-2.5 py-0.5">{selectedContestData.classLabel}</span>)}</h3>
              <button aria-label={t('common.close')} onClick={() => setSelectedContest(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status]}`}>
                  {statusLabels[selectedContestData.status]}
                </span>
                {selectedContestData.visibility === 'private' ? (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                    <Lock size={10} /> {t('instructorContest.visibilityPrivate')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                    <Globe size={10} /> {t('instructorContest.visibilityPublic')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) shadow-xs">
                  <p className="text-xs text-(--ws-muted) font-semibold uppercase tracking-wider">{t('instructorContest.fieldStart')}</p>
                  <p className="text-sm text-(--ws-text) font-semibold mt-1">{formatVNFull(selectedContestData.startTime)}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) shadow-xs">
                  <p className="text-xs text-(--ws-muted) font-semibold uppercase tracking-wider">{t('instructorContest.fieldEnd')}</p>
                  <p className="text-sm text-(--ws-text) font-semibold mt-1">{formatVNFull(selectedContestData.endTime)}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) shadow-xs">
                  <p className="text-xs text-(--ws-muted) font-semibold uppercase tracking-wider">{t('instructorContest.fieldParticipants')}</p>
                  <p className="text-sm text-(--ws-text) font-semibold mt-1">{selectedContestData.participantCount}</p>
                </div>
                <div className="p-3 bg-(--ws-panel2) rounded-xl border border-(--ws-border) shadow-xs">
                  <p className="text-xs text-(--ws-muted) font-semibold uppercase tracking-wider">{t('instructorContest.fieldProblemCount')}</p>
                  <p className="text-sm text-(--ws-text) font-semibold mt-1">{selectedContestData.problemCount}</p>
                </div>
              </div>

              {selectedContestData.lockdownEnabled && selectedContestData.status !== 'ended' && (
                <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-(--ws-warn)/35 bg-(--ws-warn-soft) text-(--ws-warn) text-sm">
                  <Lock size={14} />
                  <span className="font-semibold">{t('instructorContest.lockdownOn')}</span>
                  <span className="text-xs">{t('instructorContest.lockdownCodeLabel')}</span>
                  <span className="font-mono font-bold tracking-[0.25em]">{selectedContestData.lockdownCode ?? '—'}</span>
                </div>
              )}

              {/* Standings */}
              <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3">{t('instructorContest.standingsTitle')}</h4>
              <div className="bg-(--ws-panel2) rounded-xl border border-(--ws-border) overflow-hidden shadow-xs mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-(--ws-border) bg-(--ws-hover)">
                      <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">#</th>
                      <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colUser')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colSolved')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colScore')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colRuntime')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colPenalty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-(--ws-muted)">{t('instructorContest.noStandingsData')}</td>
                      </tr>
                    ) : standings.map((s) => (
                      <tr key={s.user_id ?? s.rank} className="border-b border-(--ws-border) hover:bg-(--ws-hover)">
                        <td className="py-2.5 px-3 text-sm text-(--ws-muted)">{s.rank}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-text) font-semibold">{s.fullName ?? s.username ?? s.email}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-ok) font-bold text-right">{s.solvedCount ?? s.solved}/{selectedContestData.problemCount}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-text) font-bold text-right">{s.score ?? 0}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-muted) text-right">{s.score ? `${s.runtime ?? 0} ms` : '—'}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-muted) text-right">{s.penalty ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    const snapshot = selectedContestData;
                    setSelectedContest(null);
                    // Use setTimeout so the detail modal fully unmounts first
                    setTimeout(() => openEdit(snapshot), 50);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-sm"
                >
                  <Edit3 size={14} /> {t('common.edit')}
                </button>
                <button
                  onClick={() => {
                    const id = selectedContestData.id;
                    setSelectedContest(null);
                    setTimeout(() => openProblemManager(id), 50);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-text) text-sm font-medium rounded-xl hover:bg-(--ws-hover) transition-colors"
                >
                  <BookOpen size={14} /> {t('instructorContest.manageProblems')}
                </button>
                <button
                  onClick={() => {
                    const id = selectedContestData.id;
                    setSelectedContest(null);
                    setTimeout(() => setShowResultsModal(id), 50);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-(--ws-info-soft) text-(--ws-info) border border-(--ws-info)/35 text-sm font-medium rounded-xl hover:bg-(--ws-info-soft) transition-colors shadow-sm"
                  title={t('instructorContest.resultsTooltip')}
                >
                  <FileText size={14} /> {t('instructorContest.resultsBtn')}
                </button>
                {!selectedContestData.lockdownEnabled && (
                  <button
                    onClick={() => {
                      const id = selectedContestData.id;
                      setSelectedContest(null);
                      setTimeout(() => setShowMonitorModal(id), 50);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-(--ws-warn-soft) text-(--ws-warn) border border-(--ws-warn)/35 text-sm font-medium rounded-xl hover:bg-(--ws-warn-soft) transition-colors shadow-sm"
                    title={t('instructorContest.monitorTooltip')}
                  >
                    <ShieldAlert size={14} /> {t('instructorContest.monitorBtn')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Problem Manager Modal ──────────────────────────────────────────── */}
      {showProblemManager && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setShowProblemManager(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <div>
                <h3 className="text-lg font-serif font-bold text-(--ws-text)">{t('instructorContest.manageProblems')}</h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.manageProblemsModalSubtitle')}</p>
              </div>
              <button aria-label={t('common.close')} onClick={() => setShowProblemManager(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
              {/* Current contest problems */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-bold text-(--ws-text) flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-(--ws-ok)" />
                    {t('instructorContest.currentProblemsHeading', { count: loadingContestProblems ? '...' : contestProblems.length })}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCompose(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors"
                  >
                    <Plus size={12} />
                    {t('instructorContest.composeNew')}
                  </button>
                </div>
                {loadingContestProblems ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="w-6 h-6 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : contestProblems.length === 0 ? (
                  <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-xl p-6 text-center text-sm text-(--ws-muted)">
                    {t('instructorContest.noProblemsInContest')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contestProblems.map((cp, i) => {
                      const diffMap: Record<string, string> = {
                        EASY: t('instructorHomework.difficultyEasyFull'),
                        MEDIUM: t('instructorHomework.difficultyMediumFull'),
                        HARD: t('instructorHomework.difficultyHard'),
                        Easy: t('instructorHomework.difficultyEasyFull'),
                        Medium: t('instructorHomework.difficultyMediumFull'),
                        Hard: t('instructorHomework.difficultyHard'),
                      };
                      const diffColor: Record<string, string> = { EASY: 'bg-(--ws-ok-soft) text-(--ws-ok)', MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn)', HARD: 'bg-(--ws-danger-soft) text-(--ws-danger)', Easy: 'bg-(--ws-ok-soft) text-(--ws-ok)', Medium: 'bg-(--ws-warn-soft) text-(--ws-warn)', Hard: 'bg-(--ws-danger-soft) text-(--ws-danger)' };
                      return (
                        <div key={cp.problem_id} className="flex items-center gap-3 px-4 py-3 bg-(--ws-panel2) border border-(--ws-border) rounded-xl">
                          <button
                            type="button"
                            onClick={() => navigate(`/instructor/problem/${cp.problem_id}`)}
                            className="flex-1 flex items-center gap-3 text-left min-w-0 group"
                            title={t('instructorContest.viewProblemTooltip')}
                          >
                            <span className="text-sm font-mono text-(--ws-muted) w-5 text-center shrink-0">{i + 1}</span>
                            <span className="flex-1 text-sm font-semibold text-(--ws-text) group-hover:underline truncate">{cp.problem.title}</span>
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${diffColor[cp.problem.difficulty] ?? 'bg-(--ws-panel2) text-(--ws-muted)'}`}>
                            {diffMap[cp.problem.difficulty] ?? cp.problem.difficulty}
                          </span>
                          <button
                            onClick={() => handleRemoveProblem(showProblemManager!, cp.problem_id)}
                            className="shrink-0 p-1.5 text-(--ws-danger) hover:bg-(--ws-danger-soft) rounded-lg transition-colors"
                            title={t('instructorContest.removeProblemTooltip')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bank problems picker */}
              <div>
                <h4 className="text-sm font-bold text-(--ws-text) mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-(--ws-info)" />
                  {t('instructorContest.problemBankHeading')}
                </h4>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
                  <input
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    placeholder={t('instructorContest.searchProblemPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                  />
                </div>
                {availableProblems.length === 0 ? (
                  <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-xl p-6 text-center text-sm text-(--ws-muted)">
                    {bankProblems.length === 0 ? t('instructorContest.bankEmptyNoProblems') : t('instructorContest.bankEmptyAllAdded')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {availableProblems.map((p) => {
                      const diffMap: Record<string, string> = {
                        EASY: t('instructorHomework.difficultyEasyFull'),
                        MEDIUM: t('instructorHomework.difficultyMediumFull'),
                        HARD: t('instructorHomework.difficultyHard'),
                      };
                      const diffColor: Record<string, string> = { EASY: 'bg-(--ws-ok-soft) text-(--ws-ok)', MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn)', HARD: 'bg-(--ws-danger-soft) text-(--ws-danger)' };
                      const isAdding = addingProblemId === p.id;
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-(--ws-panel2) border border-(--ws-border) rounded-xl hover:bg-(--ws-hover) transition-colors">
                          <p className="flex-1 text-sm font-semibold text-(--ws-text) truncate">{p.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${diffColor[p.difficulty] ?? 'bg-(--ws-panel2) text-(--ws-muted)'}`}>
                            {diffMap[p.difficulty] ?? p.difficulty}
                          </span>
                          <button
                            onClick={() => handleAddProblem(showProblemManager!, p.id)}
                            disabled={isAdding}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) disabled:opacity-60 transition-colors"
                          >
                            {isAdding ? (
                              <span className="w-3.5 h-3.5 border border-(--ws-panel) border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {t('instructorContest.addBtn')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      <ProblemFormModal
        isOpen={showCompose}
        onClose={() => !composeSaving && setShowCompose(false)}
        onSubmit={handleComposeSubmit}
        isLoading={composeSaving}
        privateProblem
        onImportedProblems={handleImportedProblems}
        titleText={t('instructorContest.composeTitle')}
        subtitleText={t('instructorContest.composeSubtitle')}
        submitText={t('instructorContest.composeSubmit')}
      />

      {/* ── Create / Edit Contest Modal ───────────────────────────────────── */}
      {showCreateModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">
                {editingContest ? t('instructorContest.editContestModalTitle') : t('instructorContest.createContestModalTitle')}
              </h3>
              <button aria-label={t('common.close')} onClick={() => setShowCreateModal(false)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldName')} <span className="text-(--ws-danger)">*</span></label>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} type="text" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)" placeholder={t('instructorContest.fieldNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) resize-none" placeholder={t('instructorContest.fieldDescPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldStartAt')} <span className="text-(--ws-danger)">*</span></label>
                  <input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldEndAt')} <span className="text-(--ws-danger)">*</span></label>
                  <input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldVisibility')}</label>
                  <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ContestForm['visibility'], classId: event.target.value === 'public' ? '' : form.classId })} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)">
                    <option value="public">{t('instructorContest.visibilityPublicOption')}</option>
                    <option value="private">{t('instructorContest.visibilityPrivateOption')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">
                    {t('instructorContest.fieldClassLabel')} {form.visibility === 'private' && <span className="text-(--ws-danger)">*</span>}
                  </label>
                  <select
                    value={form.classId}
                    onChange={(event) => setForm({ ...form, classId: event.target.value })}
                    disabled={form.visibility !== 'private'}
                    className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent) disabled:opacity-50"
                  >
                    <option value="">{t('instructorContest.selectClassPlaceholderOption')}</option>
                    {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.subject ? `${classItem.subject} - ${classItem.name}` : classItem.name}</option>)}
                  </select>
                </div>
              </div>
              {form.visibility === 'private' && !form.classId && (
                <p className="text-xs text-(--ws-warn) bg-(--ws-warn-soft) border border-(--ws-warn)/35 px-3 py-2 rounded-xl">
                  {t('instructorContest.privateClassWarning')}
                </p>
              )}

              {/* Chế độ thi: Giám sát (rời màn hình) hoặc Lockdown (khóa toàn màn hình) */}
              <div className="rounded-xl border border-(--ws-border) bg-(--ws-panel2) p-4 space-y-3">
                <label className="block text-sm font-medium text-(--ws-muted)">{t('instructorContest.fieldExamMode')}</label>

                <label className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 ${!form.lockdownEnabled ? 'border-(--ws-accent) bg-(--ws-hover)' : 'border-(--ws-border)'}`}>
                  <input
                    type="radio"
                    name="examMode"
                    checked={!form.lockdownEnabled}
                    onChange={() => setForm({ ...form, lockdownEnabled: false })}
                    className="mt-0.5 w-4 h-4 accent-(--ws-accent)"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-(--ws-text)">{t('instructorContest.modeMonitor')}</span>
                    <span className="block text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.modeMonitorHint')}</span>
                    {!form.lockdownEnabled && (
                      <span className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-(--ws-muted)">{t('instructorContest.fieldMaxWarnings')}</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, maxCheatWarnings: String(Math.max(1, (Number(form.maxCheatWarnings) || 3) - 1)) })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-(--ws-border) bg-(--ws-editor) text-(--ws-text) hover:bg-(--ws-hover)"
                          aria-label="-"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          step={1}
                          value={form.maxCheatWarnings}
                          onChange={(event) => setForm({ ...form, maxCheatWarnings: event.target.value })}
                          className="w-16 px-2 py-1.5 text-center bg-(--ws-editor) border border-(--ws-border) rounded-lg text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-(--ws-accent)"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, maxCheatWarnings: String(Math.min(20, (Number(form.maxCheatWarnings) || 3) + 1)) })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-(--ws-border) bg-(--ws-editor) text-(--ws-text) hover:bg-(--ws-hover)"
                          aria-label="+"
                        >
                          <Plus size={14} />
                        </button>
                        <span className="text-xs text-(--ws-muted)">{t('instructorContest.fieldMaxWarningsHint')}</span>
                      </span>
                    )}
                  </span>
                </label>

                <label className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 ${form.lockdownEnabled ? 'border-(--ws-accent) bg-(--ws-hover)' : 'border-(--ws-border)'}`}>
                  <input
                    type="radio"
                    name="examMode"
                    checked={form.lockdownEnabled}
                    onChange={() => setForm({ ...form, lockdownEnabled: true, lockdownCode: form.lockdownCode || generateLockdownCode() })}
                    className="mt-0.5 w-4 h-4 accent-(--ws-accent)"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-(--ws-text)">{t('instructorContest.modeLockdown')}</span>
                    <span className="block text-xs text-(--ws-muted) mt-0.5">{t('instructorContest.modeLockdownHint')}</span>
                    {form.lockdownEnabled && (
                      <span className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-medium text-(--ws-muted)">{t('instructorContest.lockdownCodeLabel')}</span>
                        <span className="px-3 py-1.5 rounded-lg bg-(--ws-editor) border border-(--ws-border) font-mono text-base font-bold tracking-[0.25em] text-(--ws-text)">
                          {form.lockdownCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setForm({ ...form, lockdownCode: generateLockdownCode() }); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-(--ws-border) text-(--ws-text) hover:bg-(--ws-hover)"
                        >
                          <RefreshCw size={12} /> {t('instructorContest.lockdownCodeRegenerate')}
                        </button>
                        <span className="basis-full text-xs text-(--ws-muted)">{t('instructorContest.lockdownCodeHint')}</span>
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveContest}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving && <span className="w-4 h-4 border-2 border-(--ws-panel) border-t-transparent rounded-full animate-spin" />}
                  {editingContest ? t('instructorHomework.saveChanges') : t('instructorContest.createSubmitBtn')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 bg-(--ws-panel2) border border-(--ws-border) text-(--ws-muted) font-medium rounded-xl hover:bg-(--ws-hover) transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Contest List ─────────────────────────────────────────────────── */}
      {filteredContests.length === 0 ? (
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-2xl p-14 text-center shadow-sm">
          <Trophy size={48} className="text-(--ws-faint) mx-auto mb-4" />
          <p className="text-(--ws-muted)">{t('instructorContest.noContestsFound')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    contest.status === 'running' ? 'bg-(--ws-ok-soft)' : contest.status === 'upcoming' ? 'bg-(--ws-warn-soft)' : 'bg-(--ws-panel2)'
                  }`}>
                    <Trophy size={20} className={
                      contest.status === 'running' ? 'text-(--ws-ok)' : contest.status === 'upcoming' ? 'text-(--ws-warn)' : 'text-(--ws-muted)'
                    } />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-(--ws-text)">{contest.title}{contest.visibility === 'private' && contest.classLabel && (<span className="ml-2 align-middle text-xs font-semibold text-(--ws-text) bg-(--ws-panel2) border border-(--ws-border) rounded-full px-2.5 py-0.5">{contest.classLabel}</span>)}</h3>
                    <div className="flex items-center gap-3 text-sm text-(--ws-muted) mt-1 flex-wrap">
                      {/* Visibility badge */}
                      {contest.visibility === 'private' ? (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                          <Lock size={9} /> {t('instructorContest.visibilityPrivate')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                          <Globe size={9} /> {t('instructorContest.visibilityPublic')}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatVNFull(contest.startTime)}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {contest.participantCount} {t('instructorContest.participantsCountSuffix')}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {contest.problemCount} {t('instructorHomework.problemsUnit')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status]}`}>
                    {statusLabels[contest.status]}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedContest(contest.id)}
                      className="p-2 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
                      title={t('instructorContest.viewDetail')}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEdit(contest)}
                      className="p-2 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-info) hover:bg-(--ws-hover) transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openProblemManager(contest.id)}
                      className="p-2 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-ok) hover:bg-(--ws-hover) transition-colors"
                      title={t('instructorContest.manageProblems')}
                    >
                      <BookOpen size={16} />
                    </button>
                    {!contest.lockdownEnabled && (
                      <button
                        onClick={() => setShowMonitorModal(contest.id)}
                        className="p-2 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-warn) hover:bg-(--ws-hover) transition-colors"
                        title={t('instructorContest.monitorBtn')}
                      >
                        <ShieldAlert size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => removeContest(contest.id)}
                      className="p-2 bg-(--ws-panel) border border-(--ws-border) rounded-lg text-(--ws-text) hover:text-(--ws-danger) hover:bg-(--ws-hover) transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Kết quả thi chi tiết ───────────────────────────────────────────── */}
      {showResultsModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowResultsModal(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-6xl max-h-[88vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 p-6 border-b border-(--ws-border)">
              <div className="min-w-0">
                <h3 className="text-lg font-serif font-bold text-(--ws-text) flex items-center gap-2">
                  <FileText size={20} className="text-(--ws-info)" /> {t('instructorContest.resultsModalTitle')}
                </h3>
                {resultsData && (
                  <p className="text-xs text-(--ws-muted) mt-0.5 truncate">
                    {resultsData.contest.title} · {t('instructorContest.resultsCount', { count: resultsData.results.length })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={exportResultsCsv}
                  disabled={!resultsData || resultsData.results.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-colors disabled:opacity-50"
                >
                  <Download size={14} /> {t('instructorContest.exportCsv')}
                </button>
                <button aria-label={t('common.close')} onClick={() => setShowResultsModal(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto">
              {loadingResults ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-(--ws-accent)" />
                </div>
              ) : !resultsData || resultsData.results.length === 0 ? (
                <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-xl p-8 text-center text-sm text-(--ws-muted)">
                  {t('instructorContest.resultsEmpty')}
                </div>
              ) : (
                <div className="bg-(--ws-panel2) rounded-xl border border-(--ws-border) overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-(--ws-border) bg-(--ws-hover)">
                        <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.resultsColNo')}</th>
                        <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colUser')}</th>
                        {resultsData.problems.map((p) => (
                          <th key={p.id} className="text-center text-xs font-semibold text-(--ws-muted) py-2.5 px-3 tracking-wider min-w-44 whitespace-normal wrap-break-word">{p.title}</th>
                        ))}
                        <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.resultsColTotal')}</th>
                        <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.resultsColNote')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((r, index) => {
                        const note = resultNote(r);
                        return (
                          <tr key={r.user_id} className="border-b border-(--ws-border) last:border-b-0 hover:bg-(--ws-hover)">
                            <td className="py-2.5 px-3 text-sm text-(--ws-muted)">{index + 1}</td>
                            <td className="py-2.5 px-3 text-sm font-semibold text-(--ws-text)">{r.username}</td>
                            {resultsData.problems.map((p) => {
                              const cell = r.problems[p.id];
                              return (
                                <td key={p.id} className="py-2.5 px-3 text-center text-sm text-(--ws-text)">
                                  <span className="inline-flex items-center justify-center gap-1.5">
                                    {cell?.score ?? 0}/100
                                    {cell?.latest_submission_id && (
                                      <button
                                        type="button"
                                        onClick={() => setViewCode({ submissionId: cell.latest_submission_id as string, student: r.username, problem: p.title })}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-(--ws-border) bg-(--ws-panel) text-[10px] font-semibold text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors whitespace-nowrap"
                                        title={t('instructorContest.viewSubmissionTitle')}
                                      >
                                        <Eye size={12} /> {t('instructorContest.viewSubmission')}
                                      </button>
                                    )}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-sm text-(--ws-text) font-bold text-right">{r.score}/{resultsData.problems.length * 100}</td>
                            <td className="py-2.5 px-3 text-xs">
                              {note ? (
                                <span className={r.is_disqualified ? 'text-(--ws-danger) font-semibold' : 'text-(--ws-warn)'}>{note}</span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Xem bài nộp gần nhất của thí sinh trong kỳ thi (giao diện giống mục Chấm bài & Bài nộp) */}
      {viewCode && (
        <SubmissionDetailModal
          submissionId={viewCode.submissionId}
          usernameOverride={viewCode.student}
          hideProblemActions
          scoreMax={100}
          onGraded={() => { if (showResultsModal) fetchContestResults(showResultsModal).then(setResultsData).catch(() => {}); }}
          onClose={() => setViewCode(null)}
        />
      )}

      {/* ── Giám sát kỳ thi (trực tiếp) ──────────────────────────────────────── */}
      {showMonitorModal && (
        <ContestMonitor
          contestId={showMonitorModal}
          contestTitle={contests.find((c) => c.id === showMonitorModal)?.title}
          status={monitorStatus}
          onClose={() => setShowMonitorModal(null)}
        />
      )}
    </div>
  );
}