import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, Clock, Search, Trophy, Users, X, Lock, Globe, BookOpen, Play, CheckCircle2 } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery, type ContestDto, fetchContestDetail, joinContest, useLeaderboardQuery } from '../../api/contests';
import { formatVNFull } from '../../utils/dateTime';
import { notifyGlobalToast } from '../../context/ToastContext';

const statusColors: Record<NonNullable<ContestDto['status']>, string> = {
  upcoming: 'bg-(--ws-warn-soft) text-(--ws-warn) border-(--ws-warn)/35',
  running: 'bg-(--ws-ok-soft) text-(--ws-ok) border-(--ws-ok)/35',
  ended: 'bg-(--ws-panel2) text-(--ws-muted) border-(--ws-border)',
};

const typeColors: Record<NonNullable<ContestDto['type']>, string> = {
  ICPC: 'bg-(--ws-info-soft) text-(--ws-info)',
  OI: 'bg-(--ws-info-soft) text-(--ws-info)',
  Homework: 'bg-(--ws-ok-soft) text-(--ws-ok)',
};

export default function Contest() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useContestsQuery();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [contestProblems, setContestProblems] = useState<Array<{ problem_id: string; problem: { id: string; title: string; difficulty: string } }>>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [registeredContestIds, setRegisteredContestIds] = useState<string[]>([]);

  // Trạng thái kỳ thi tính theo giờ hiện tại ở trình duyệt, tự cập nhật đúng thời điểm bắt đầu/kết thúc
  // (không cần tải lại trang).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const boundaries = (data ?? [])
      .flatMap((c) => [new Date(c.startTime).getTime(), new Date(c.endTime).getTime()])
      .filter((ts) => Number.isFinite(ts) && ts > now);
    if (boundaries.length === 0) return;
    const delay = Math.min(Math.min(...boundaries) - now + 200, 2147483000);
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [data, now]);
  const contests = useMemo(
    () =>
      (data ?? []).map((c): ContestDto => {
        const start = new Date(c.startTime).getTime();
        const end = new Date(c.endTime).getTime();
        const status: ContestDto['status'] = now < start ? 'upcoming' : now <= end ? 'running' : 'ended';
        return { ...c, status };
      }),
    [data, now],
  );
  const statusLabels: Record<NonNullable<ContestDto['status']>, string> = {
    upcoming: t('instructorContest.statusUpcoming'),
    running: t('instructorContest.statusRunning'),
    ended: t('instructorContest.statusEnded'),
  };
  const visibilityLabels: Record<NonNullable<ContestDto['visibility']>, string> = {
    public: t('studentContest.visibilityPublic'),
    private: t('studentContest.visibilityPrivate'),
  };
  const difficultyLabels: Record<string, string> = {
    EASY: t('instructorHomework.difficultyEasyFull'),
    Easy: t('instructorHomework.difficultyEasyFull'),
    MEDIUM: t('instructorHomework.difficultyMediumFull'),
    Medium: t('instructorHomework.difficultyMediumFull'),
    HARD: t('instructorHomework.difficultyHard'),
    Hard: t('instructorHomework.difficultyHard'),
  };

  const filteredContests = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return contests.filter((contest) => {
      const matchesFilter = filter === 'all' || contest.status === filter;
      const matchesSearch = !search || contest.title.toLowerCase().includes(search) || contest.id.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [contests, filter, searchQuery]);

  const selectedContestData = contests.find((contest) => contest.id === selectedContest);
  const hasDocument = typeof document !== 'undefined';

  const isRegistered = (contestId: string) =>
    registeredContestIds.includes(contestId) || !!contests.find((c) => c.id === contestId)?.isRegistered;

  const [modalTab, setModalTab] = useState<'info' | 'leaderboard'>('info');
  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useLeaderboardQuery(selectedContest ?? undefined);

  const openContest = async (contestId: string) => {
    setSelectedContest(contestId);
    setModalTab('info');
    setContestProblems([]);
    setLoadingProblems(true);
    try {
      const detail = await fetchContestDetail(contestId);
      setContestProblems(detail.problems ?? []);
    } catch {
      setContestProblems([]);
    } finally {
      setLoadingProblems(false);
    }
  };

  // Mở thẳng một kỳ thi từ link ngoài (vd Tổng quan): /student/contest?open=<id>
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (!openParam || !data?.some((c) => c.id === openParam)) return;
    void openContest(openParam);
    setSearchParams((prev) => {
      prev.delete('open');
      return prev;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, data]);

  const registerForContest = async (contest: ContestDto) => {
    if (isRegistered(contest.id)) return;
    try {
      await joinContest(contest.id);
      setRegisteredContestIds((prev) => [...prev, contest.id]);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
    } catch (err) {
      // Đăng ký thất bại thì không đánh dấu đã đăng ký (tránh hiển thị sai sau khi tải lại)
      notifyGlobalToast(err instanceof ApiError ? err.message : t('studentContest.registerFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-(--ws-text)">
        <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.contest')}</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) px-5 py-4 shadow-sm">
              <div className="h-4 w-56 rounded bg-(--ws-panel2) animate-pulse" />
              <div className="mt-3 h-3 w-80 rounded bg-(--ws-panel2) animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-(--ws-border) bg-(--ws-panel) p-10 text-center shadow-sm">
        <Trophy size={48} className="text-(--ws-faint) mx-auto mb-4" />
        <h2 className="text-xl font-bold text-(--ws-text)">{t('studentContest.loadError')}</h2>
        <p className="mt-2 text-sm text-(--ws-muted)">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-(--ws-text)">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.contest')}</h2>
        </div>
        <div className="text-sm text-(--ws-ok) font-medium">
          {t('studentContest.runningCount', { count: contests.filter((contest) => contest.status === 'running').length })}
        </div>
      </div>

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
        <div className="flex gap-2 flex-wrap">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === level ? 'bg-(--ws-accent) text-(--ws-on-accent) shadow-sm' : 'bg-(--ws-panel) text-(--ws-text) hover:text-(--ws-text) border border-(--ws-border)'
              }`}
            >
              {level === 'all' ? t('instructorContest.filterAll') : statusLabels[level]}
            </button>
          ))}
        </div>
      </div>

      {selectedContest && selectedContestData && hasDocument && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-90 flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-(--ws-border)">
              <h3 className="text-lg font-serif font-bold text-(--ws-text)">{selectedContestData.title}{selectedContestData.visibility === 'private' && selectedContestData.classLabel && (<span className="ml-2 align-middle text-xs font-semibold text-(--ws-text) bg-(--ws-panel2) border border-(--ws-border) rounded-full px-2.5 py-0.5">{selectedContestData.classLabel}</span>)}</h3>
              <button aria-label={t('common.close')} onClick={() => setSelectedContest(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={20} aria-hidden="true" /></button>
            </div>
            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-6 pt-2 border-b border-(--ws-border) bg-(--ws-panel2)">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'info'
                    ? 'border-(--ws-accent) text-(--ws-accent)'
                    : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                <BookOpen size={14} /> {t('studentContest.infoTab')}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('leaderboard')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'leaderboard'
                    ? 'border-(--ws-accent) text-(--ws-accent)'
                    : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                <Trophy size={14} /> {t('studentContest.leaderboardTab')}
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {modalTab === 'info' ? (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[selectedContestData.status ?? 'upcoming']}`}>
                      {statusLabels[selectedContestData.status ?? 'upcoming']}
                    </span>
                    {selectedContestData.visibility === 'private' ? (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                        <Lock size={10} /> {t('studentContest.visibilityPrivateClass')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                        <Globe size={10} /> {t('studentContest.visibilityPublic')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-(--ws-text) mb-6 leading-relaxed">
                    {selectedContestData.description ?? t('studentContest.descriptionFallback')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                      <div className="flex items-center gap-2 text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Calendar size={14} /> {t('instructorContest.fieldStart')}
                      </div>
                      <p className="text-sm text-(--ws-text) font-semibold">{formatVNFull(selectedContestData.startTime)}</p>
                    </div>
                    <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                      <div className="flex items-center gap-2 text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Clock size={14} /> {t('instructorContest.fieldEnd')}
                      </div>
                      <p className="text-sm text-(--ws-text) font-semibold">{formatVNFull(selectedContestData.endTime)}</p>
                    </div>
                    <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                      <div className="flex items-center gap-2 text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Users size={14} /> {t('instructorContest.fieldParticipants')}
                      </div>
                      <p className="text-sm text-(--ws-text) font-semibold">{selectedContestData.participantCount ?? 0}</p>
                    </div>
                    <div className="p-4 bg-(--ws-panel) rounded-xl border border-(--ws-border)">
                      <div className="flex items-center gap-2 text-xs text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Trophy size={14} /> {t('studentContest.problemCountLabel')}
                      </div>
                      <p className="text-sm text-(--ws-text) font-semibold">{selectedContestData.problemCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Registration / Status Banner */}
                  {selectedContestData.status === 'ended' ? (
                    <div className="mb-6 border border-(--ws-border) rounded-xl bg-(--ws-panel2) p-3.5 flex items-center gap-2.5 text-xs text-(--ws-text)">
                      <Clock size={16} className="text-(--ws-muted) shrink-0" />
                      <span>{t('studentContest.endedHint')}</span>
                    </div>
                  ) : !isRegistered(selectedContestData.id) ? (
                    <div className="mb-6 border border-(--ws-border) rounded-xl bg-(--ws-panel2) p-4">
                      <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-1.5">{t('studentContest.registerTitle')}</h4>
                      <p className="text-xs text-(--ws-muted) mb-3">
                        {selectedContestData.visibility === 'private'
                          ? t('studentContest.privateClassAddedHint')
                          : t('studentContest.publicHint')}
                      </p>
                      <button
                        type="button"
                        onClick={() => registerForContest(selectedContestData)}
                        className="w-full py-2.5 bg-(--ws-accent) text-(--ws-on-accent) font-medium rounded-xl hover:bg-(--ws-accent-strong) transition-all shadow-md"
                      >
                        {selectedContestData.status === 'running' ? t('studentContest.joinContestBtn') : t('studentContest.registerContestBtn')}
                      </button>
                    </div>
                  ) : selectedContestData.status === 'upcoming' ? (
                    <div className="mb-6 p-3.5 bg-(--ws-ok-soft) border border-(--ws-ok)/35 text-(--ws-ok) text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} className="text-(--ws-ok) shrink-0" />
                      <span>{t('studentContest.registeredHint')}</span>
                    </div>
                  ) : null}

                  {/* Problem list: chỉ hiện khi cuộc thi đang diễn ra (và đã đăng ký); chưa bắt đầu hoặc đã kết thúc thì ẩn */}
                  {isRegistered(selectedContestData.id) && selectedContestData.status === 'running' && (
                    <div className="mb-2">
                      <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-3 flex items-center gap-2">
                        <BookOpen size={15} /> {t('studentContest.problemsInContest')}
                      </h4>
                      {loadingProblems ? (
                        <div className="flex items-center justify-center h-16">
                          <div className="w-6 h-6 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : contestProblems.length === 0 ? (
                        <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-xl p-6 text-center text-sm text-(--ws-muted)">
                          {t('studentContest.emptyState')}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contestProblems.map((cp, i) => {
                            const diffColor: Record<string, string> = { EASY: 'bg-(--ws-ok-soft) text-(--ws-ok)', MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn)', HARD: 'bg-(--ws-danger-soft) text-(--ws-danger)', Easy: 'bg-(--ws-ok-soft) text-(--ws-ok)', Medium: 'bg-(--ws-warn-soft) text-(--ws-warn)', Hard: 'bg-(--ws-danger-soft) text-(--ws-danger)' };
                            return (
                              <div key={cp.problem_id} className="flex items-center gap-3 px-4 py-3 bg-(--ws-panel) border border-(--ws-border) rounded-xl hover:bg-(--ws-hover) transition-colors">
                                <span className="text-sm font-mono text-(--ws-muted) w-5 text-center">{i + 1}</span>
                                <p className="flex-1 text-sm font-semibold text-(--ws-text) truncate">{cp.problem.title}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${diffColor[cp.problem.difficulty] ?? 'bg-(--ws-panel2) text-(--ws-muted)'}`}>
                                  {difficultyLabels[cp.problem.difficulty] ?? cp.problem.difficulty}
                                </span>
                                <Link
                                  to={`/student/contest/${selectedContestData.id}/problem/${cp.problem_id}`}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded-xl hover:bg-(--ws-accent-strong) transition-colors"
                                  onClick={() => setSelectedContest(null)}
                                >
                                  <Play size={11} fill="white" /> {t('studentHomework.goSolve')}
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Leaderboard Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-(--ws-border)">
                    <h4 className="text-sm font-bold font-serif text-(--ws-text) flex items-center gap-2">
                      <Trophy size={16} className="text-(--ws-warn)" /> {t('studentContest.leaderboardTab')}
                    </h4>
                    <span className="text-xs text-(--ws-muted)">
                      {t('studentContest.peopleCount', { count: leaderboard.length })}
                    </span>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-(--ws-accent) border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center bg-(--ws-panel2) border border-(--ws-border) rounded-xl">
                      <Trophy size={36} className="text-(--ws-faint) mx-auto mb-2" />
                      <p className="text-sm font-semibold text-(--ws-text)">{t('studentContest.emptyLeaderboard')}</p>
                      <p className="text-xs text-(--ws-muted) mt-1">{t('studentContest.leaderboardUpdateHint')}</p>
                    </div>
                  ) : (
                    <div className="bg-(--ws-panel2) rounded-xl border border-(--ws-border) overflow-hidden shadow-xs">
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
                          {leaderboard.map((s: any) => (
                            <tr key={s.user_id ?? s.rank} className="border-b border-(--ws-border) hover:bg-(--ws-hover)">
                              <td className="py-2.5 px-3 text-sm text-(--ws-muted)">{s.rank}</td>
                              <td className="py-2.5 px-3 text-sm text-(--ws-text) font-semibold">{s.fullName ?? s.username ?? s.email}</td>
                              <td className="py-2.5 px-3 text-sm text-(--ws-ok) font-bold text-right">{s.solvedCount ?? s.solved}/{selectedContestData.problemCount ?? 0}</td>
                              <td className="py-2.5 px-3 text-sm text-(--ws-text) font-bold text-right">{s.score ?? 0}</td>
                              <td className="py-2.5 px-3 text-sm text-(--ws-muted) text-right">{s.score ? `${s.runtime ?? 0} ms` : '—'}</td>
                              <td className="py-2.5 px-3 text-sm text-(--ws-muted) text-right">{s.penalty ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      <div className="space-y-4">
        {filteredContests.length === 0 ? (
          <div className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-12 text-center shadow-sm">
            <Trophy size={48} className="text-(--ws-faint) mx-auto mb-4" />
            <p className="text-(--ws-muted)">{t('studentContest.emptyState')}</p>
          </div>
        ) : (
          filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-(--ws-panel) border border-(--ws-border) rounded-xl p-6 hover:shadow-md hover:border-(--ws-accent)/30 transition-all cursor-pointer shadow-sm"
              onClick={() => openContest(contest.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contest.status === 'running' ? 'bg-(--ws-ok-soft)' : contest.status === 'upcoming' ? 'bg-(--ws-warn-soft)' : 'bg-(--ws-panel2)'}`}>
                      <Trophy size={20} className={contest.status === 'running' ? 'text-(--ws-ok)' : contest.status === 'upcoming' ? 'text-(--ws-warn)' : 'text-(--ws-muted)'} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-serif text-(--ws-text)">{contest.title}{contest.visibility === 'private' && contest.classLabel && (<span className="ml-2 align-middle text-xs font-semibold text-(--ws-text) bg-(--ws-panel2) border border-(--ws-border) rounded-full px-2.5 py-0.5">{contest.classLabel}</span>)}</h3>
                      <div className="flex items-center gap-3 text-sm text-(--ws-muted) mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColors[contest.type ?? 'Homework']}`}>
                          {contest.type ?? 'Homework'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-(--ws-panel) text-(--ws-text) border-(--ws-border)">
                          {visibilityLabels[contest.visibility ?? 'public']}
                        </span>
                        {contest.className && <span className="text-xs text-(--ws-muted)">{contest.className}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 text-sm text-(--ws-muted)">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {formatVNFull(contest.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {t('studentContest.peopleCount', { count: contest.participantCount ?? 0 })}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status ?? 'upcoming']}`}>
                    {statusLabels[contest.status ?? 'upcoming']}
                  </span>
                  <ChevronRight size={20} className="text-(--ws-muted)" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}