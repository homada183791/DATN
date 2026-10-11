import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContest, deleteContest, updateContest,
  useContestsQuery, useLeaderboardQuery,
  addProblemToContest, removeProblemFromContest, fetchContestDetail,
  calculateContestElo, fetchPlagiarismReports, type PlagiarismReportDto,
} from '../../api/contests';
import { useClassesQuery } from '../../api/classes';
import { useProblemsQuery } from '../../api/problems';
import { ApiError } from '../../api/http';
import { notifyGlobalToast } from '../../context/ToastContext';
import { toDatetimeLocal, datetimeLocalToISO, formatVNFull } from '../../utils/dateTime';
import {
  Trophy, Users, Plus, Search, X, Calendar, Edit3, Trash2, Eye,
  Lock, Globe, BookOpen, CheckCircle2, ShieldAlert, TrendingUp, Loader2,
} from 'lucide-react';

type ContestForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  visibility: 'public' | 'private';
  classId: string;
};

const emptyContestForm: ContestForm = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  visibility: 'public',
  classId: '',
};

export default function InstructorContest() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [showProblemManager, setShowProblemManager] = useState<string | null>(null);
  const [form, setForm] = useState<ContestForm>(emptyContestForm);
  const [editingContest, setEditingContest] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasDocument = typeof document !== 'undefined';
  const { data: contests = [] } = useContestsQuery();
  const { data: leaderboard = [] } = useLeaderboardQuery(selectedContest ?? undefined);
  const { data: classes = [] } = useClassesQuery();
  const { data: bankProblems = [] } = useProblemsQuery();

  // ── Contest problem manager state ────────────────────────────────────────
  const [contestProblems, setContestProblems] = useState<Array<{ problem_id: string; problem: { id: string; title: string; difficulty: string } }>>([]);
  const [loadingContestProblems, setLoadingContestProblems] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [addingProblemId, setAddingProblemId] = useState<string | null>(null);

  // ── Plagiarism & ELO state ──────────────────────────────────────────────
  const [showPlagiarismModal, setShowPlagiarismModal] = useState<string | null>(null);
  const [plagiarismReports, setPlagiarismReports] = useState<PlagiarismReportDto[]>([]);
  const [loadingPlagiarism, setLoadingPlagiarism] = useState(false);
  const [calculatingEloContestId, setCalculatingEloContestId] = useState<string | null>(null);

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

  const handleCalculateElo = async (contestId: string) => {
    setCalculatingEloContestId(contestId);
    try {
      await calculateContestElo(contestId);
      notifyGlobalToast(t('instructorContest.success.eloCalculated'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
      await queryClient.invalidateQueries({ queryKey: ['users', 'top-rated'] });
    } catch (err: any) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.errors.eloCalculationFailed'));
    } finally {
      setCalculatingEloContestId(null);
    }
  };

  const openPlagiarismModal = async (contestId: string) => {
    setShowPlagiarismModal(contestId);
    setLoadingPlagiarism(true);
    try {
      const reports = await fetchPlagiarismReports(contestId);
      setPlagiarismReports(reports);
    } catch (err: any) {
      notifyGlobalToast(err instanceof ApiError ? err.message : t('instructorContest.errors.loadPlagiarismFailed'));
      setPlagiarismReports([]);
    } finally {
      setLoadingPlagiarism(false);
    }
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

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        // Convert datetime-local (UTC+7 local) to ISO for backend
        start_time: datetimeLocalToISO(form.startTime),
        end_time: datetimeLocalToISO(form.endTime),
        is_private: form.visibility === 'private',
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
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ended: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
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
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('instructorContest.pageTitle')}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
        >
          <Plus size={18} /> {t('instructorContest.createNew')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-yellow-600">{contests.filter((c) => c.status === 'upcoming').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorContest.statUpcoming')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-emerald-700">{contests.filter((c) => c.status === 'running').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorContest.statRunning')}</p>
        </div>
        <div className="bg-white border border-[#e5dac9] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold font-serif text-[#8a8073]">{contests.filter((c) => c.status === 'ended').length}</p>
          <p className="text-xs text-[#8a8073] mt-0.5">{t('instructorContest.statEnded')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8073]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('instructorContest.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5dac9] rounded-xl text-[#191919] placeholder-[#bfae99] focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[#193a2b] text-white shadow-sm'
                  : 'bg-white text-[#5c5446] hover:text-[#191919] border border-[#e5dac9]'
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
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">{selectedContestData.title}</h3>
              <button onClick={() => setSelectedContest(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status]}`}>
                  {statusLabels[selectedContestData.status]}
                </span>
                {selectedContestData.visibility === 'private' ? (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-purple-50 text-purple-700 border-purple-200">
                    <Lock size={10} /> {t('instructorContest.visibilityPrivate')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-sky-50 text-sky-700 border-sky-200">
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

              {/* Standings */}
              <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3">{t('instructorContest.standingsTitle')}</h4>
              <div className="bg-(--ws-panel2) rounded-xl border border-(--ws-border) overflow-hidden shadow-xs mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-(--ws-border) bg-(--ws-hover)">
                      <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">#</th>
                      <th className="text-left text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colUser')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colSolved')}</th>
                      <th className="text-right text-xs font-semibold text-(--ws-muted) py-2.5 px-3 uppercase tracking-wider">{t('instructorContest.colPenalty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-(--ws-muted)">{t('instructorContest.noStandingsData')}</td>
                      </tr>
                    ) : standings.map((s) => (
                      <tr key={s.user_id ?? s.rank} className="border-b border-(--ws-border) hover:bg-(--ws-hover)">
                        <td className="py-2.5 px-3 text-sm text-(--ws-muted)">{s.rank}</td>
                        <td className="py-2.5 px-3 text-sm text-(--ws-text) font-semibold">{s.fullName ?? s.username ?? s.email}</td>
                        <td className="py-2.5 px-3 text-sm text-emerald-700 font-bold text-right">{s.solvedCount ?? s.solved}</td>
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#193a2b] text-white text-sm font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-sm"
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
                  onClick={() => openPlagiarismModal(selectedContestData.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 text-sm font-medium rounded-xl hover:bg-amber-100 transition-colors shadow-sm"
                  title={t('instructorContest.checkPlagiarismTooltip')}
                >
                  <ShieldAlert size={14} /> {t('instructorContest.checkPlagiarismBtn')}
                </button>
                {selectedContestData.status === 'ended' && (
                  <button
                    onClick={() => handleCalculateElo(selectedContestData.id)}
                    disabled={calculatingEloContestId === selectedContestData.id}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-60"
                    title={t('instructorContest.finalizeEloTooltip')}
                  >
                    {calculatingEloContestId === selectedContestData.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <TrendingUp size={14} />
                    )}
                    {t('instructorContest.finalizeEloBtn')}
                  </button>
                )}
                <button onClick={() => { removeContest(selectedContestData.id); }} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 size={14} /> {t('common.delete')}
                </button>
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
              <button onClick={() => setShowProblemManager(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
              {/* Current contest problems */}
              <div>
                <h4 className="text-sm font-bold text-(--ws-text) mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {t('instructorContest.currentProblemsHeading', { count: loadingContestProblems ? '...' : contestProblems.length })}
                </h4>
                {loadingContestProblems ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="w-6 h-6 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
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
                      const diffColor: Record<string, string> = { EASY: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HARD: 'bg-red-100 text-red-700', Easy: 'bg-emerald-100 text-emerald-700', Medium: 'bg-yellow-100 text-yellow-700', Hard: 'bg-red-100 text-red-700' };
                      return (
                        <div key={cp.problem_id} className="flex items-center gap-3 px-4 py-3 bg-(--ws-panel2) border border-(--ws-border) rounded-xl">
                          <span className="text-sm font-mono text-(--ws-muted) w-5 text-center">{String.fromCharCode(65 + i)}</span>
                          <p className="flex-1 text-sm font-semibold text-(--ws-text)">{cp.problem.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${diffColor[cp.problem.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                            {diffMap[cp.problem.difficulty] ?? cp.problem.difficulty}
                          </span>
                          <button
                            onClick={() => handleRemoveProblem(showProblemManager!, cp.problem_id)}
                            className="shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                  <BookOpen size={16} className="text-blue-600" />
                  {t('instructorContest.problemBankHeading')}
                </h4>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" />
                  <input
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    placeholder={t('instructorContest.searchProblemPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-sm text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]"
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
                      const diffColor: Record<string, string> = { EASY: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HARD: 'bg-red-100 text-red-700' };
                      const isAdding = addingProblemId === p.id;
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-(--ws-panel2) border border-(--ws-border) rounded-xl hover:bg-(--ws-hover) transition-colors">
                          <p className="flex-1 text-sm font-semibold text-(--ws-text) truncate">{p.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${diffColor[p.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                            {diffMap[p.difficulty] ?? p.difficulty}
                          </span>
                          <button
                            onClick={() => handleAddProblem(showProblemManager!, p.id)}
                            disabled={isAdding}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] disabled:opacity-60 transition-colors"
                          >
                            {isAdding ? (
                              <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
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

      {/* ── Create / Edit Contest Modal ───────────────────────────────────── */}
      {showCreateModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-80 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">
                {editingContest ? t('instructorContest.editContestModalTitle') : t('instructorContest.createContestModalTitle')}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldName')} <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} type="text" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b]" placeholder={t('instructorContest.fieldNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorClass.fieldDescription')}</label>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:ring-2 focus:ring-[#193a2b] resize-none" placeholder={t('instructorContest.fieldDescPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldStartAt')} <span className="text-red-500">*</span></label>
                  <input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldEndAt')} <span className="text-red-500">*</span></label>
                  <input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} type="datetime-local" className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-[#193a2b]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">{t('instructorContest.fieldVisibility')}</label>
                  <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ContestForm['visibility'], classId: event.target.value === 'public' ? '' : form.classId })} className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-[#193a2b]">
                    <option value="public">{t('instructorContest.visibilityPublicOption')}</option>
                    <option value="private">{t('instructorContest.visibilityPrivateOption')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--ws-muted) mb-1.5">
                    {t('instructorContest.fieldClassLabel')} {form.visibility === 'private' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.classId}
                    onChange={(event) => setForm({ ...form, classId: event.target.value })}
                    disabled={form.visibility !== 'private'}
                    className="w-full px-4 py-2.5 bg-(--ws-editor) border border-(--ws-border) rounded-xl text-(--ws-text) focus:outline-none focus:ring-2 focus:ring-[#193a2b] disabled:opacity-50"
                  >
                    <option value="">{t('instructorContest.selectClassPlaceholderOption')}</option>
                    {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
                  </select>
                </div>
              </div>
              {form.visibility === 'private' && !form.classId && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-xl">
                  {t('instructorContest.privateClassWarning')}
                </p>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveContest}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
        <div className="bg-white border border-[#e5dac9] rounded-2xl p-14 text-center shadow-sm">
          <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
          <p className="text-[#8a8073]">{t('instructorContest.noContestsFound')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    contest.status === 'running' ? 'bg-emerald-100' : contest.status === 'upcoming' ? 'bg-yellow-100' : 'bg-[#f0ebd9]'
                  }`}>
                    <Trophy size={20} className={
                      contest.status === 'running' ? 'text-emerald-700' : contest.status === 'upcoming' ? 'text-yellow-700' : 'text-[#8a8073]'
                    } />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-[#191919]">{contest.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-[#8a8073] mt-1 flex-wrap">
                      {/* Visibility badge */}
                      {contest.visibility === 'private' ? (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase bg-purple-50 text-purple-700 border-purple-200">
                          <Lock size={9} /> {t('instructorContest.visibilityPrivate')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase bg-sky-50 text-sky-700 border-sky-200">
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
                      className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-[#191919] hover:bg-[#f7f4eb] transition-colors"
                      title={t('instructorContest.viewDetail')}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEdit(contest)}
                      className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-blue-600 hover:bg-[#f7f4eb] transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openProblemManager(contest.id)}
                      className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-emerald-600 hover:bg-[#f7f4eb] transition-colors"
                      title={t('instructorContest.manageProblems')}
                    >
                      <BookOpen size={16} />
                    </button>
                    <button
                      onClick={() => openPlagiarismModal(contest.id)}
                      className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-amber-600 hover:bg-[#f7f4eb] transition-colors"
                      title={t('instructorContest.checkPlagiarismBtn')}
                    >
                      <ShieldAlert size={16} />
                    </button>
                    {contest.status === 'ended' && (
                      <button
                        onClick={() => handleCalculateElo(contest.id)}
                        disabled={calculatingEloContestId === contest.id}
                        className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-indigo-600 hover:bg-[#f7f4eb] transition-colors disabled:opacity-50"
                        title={t('instructorContest.finalizeEloBtn')}
                      >
                        {calculatingEloContestId === contest.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <TrendingUp size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => removeContest(contest.id)}
                      className="p-2 bg-white border border-[#e5dac9] rounded-lg text-[#5c5446] hover:text-red-600 hover:bg-[#f7f4eb] transition-colors"
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

      {/* ── Plagiarism Report Modal ────────────────────────────────────────── */}
      {showPlagiarismModal && hasDocument && createPortal((
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setShowPlagiarismModal(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <div>
                <h3 className="text-lg font-serif font-bold text-(--ws-text) flex items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-600" /> {t('instructorContest.plagiarismModalTitle')}
                </h3>
                <p className="text-xs text-(--ws-muted) mt-0.5">
                  {t('instructorContest.plagiarismModalSubtitle')}
                </p>
              </div>
              <button onClick={() => setShowPlagiarismModal(null)} className="text-(--ws-muted) hover:text-(--ws-text)">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-90px)]">
              {loadingPlagiarism ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={28} className="animate-spin text-[#193a2b]" />
                  <p className="text-xs text-(--ws-muted)">{t('instructorContest.loadingPlagiarismText')}</p>
                </div>
              ) : plagiarismReports.length === 0 ? (
                <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-2xl p-12 text-center">
                  <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-3" />
                  <p className="font-bold text-(--ws-text)">{t('instructorContest.noPlagiarismTitle')}</p>
                  <p className="text-xs text-(--ws-muted) mt-1">
                    {t('instructorContest.noPlagiarismSubtitle')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-(--ws-muted)">
                      {t('instructorContest.foundPairsText', { count: plagiarismReports.length })}
                    </p>
                  </div>
                  <div className="bg-(--ws-panel2) rounded-xl border border-(--ws-border) overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-(--ws-border) bg-(--ws-hover) text-xs text-(--ws-muted) uppercase tracking-wider">
                          <th className="py-3 px-4">{t('instructorContest.colProblem')}</th>
                          <th className="py-3 px-4">{t('instructorContest.colStudent1')}</th>
                          <th className="py-3 px-4">{t('instructorContest.colStudent2')}</th>
                          <th className="py-3 px-4 text-center">{t('instructorContest.colSimilarity')}</th>
                          <th className="py-3 px-4 text-right">{t('instructorContest.colSubmittedAt')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--ws-border)">
                        {plagiarismReports.map((report) => {
                          const pct = Math.round(report.similarity_score * 100);
                          const badgeColor = pct >= 80 ? 'bg-red-100 text-red-800 border-red-200' : pct >= 60 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200';
                          return (
                            <tr key={report.id} className="hover:bg-(--ws-hover) transition-colors">
                              <td className="py-3 px-4 font-semibold text-(--ws-text)">
                                {report.problem?.title ?? t('instructorContest.colProblem')}
                              </td>
                              <td className="py-3 px-4 text-(--ws-text)">
                                {report.submission_1?.user?.email ?? t('instructorContest.colStudent1')}
                              </td>
                              <td className="py-3 px-4 text-(--ws-text)">
                                {report.submission_2?.user?.email ?? t('instructorContest.colStudent2')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
                                  {pct}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-(--ws-muted) text-right font-mono">
                                {report.created_at ? formatVNFull(report.created_at) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
