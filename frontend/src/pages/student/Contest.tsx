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

  useEffect(() => {
    if (!selectedContest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedContest(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedContest]);

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
        <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) divide-y divide-(--ws-border-soft)">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-56 max-w-full rounded ws-skeleton" />
                <div className="h-3 w-40 max-w-full rounded ws-skeleton" />
              </div>
              <div className="h-6 w-20 rounded ws-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) p-10 text-center">
        <Trophy size={40} className="text-(--ws-faint) mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-(--ws-text)">{t('studentContest.loadError')}</h2>
        <p className="mt-1.5 text-sm text-(--ws-muted)">{error.message}</p>
      </div>
    );
  }

  const formatDuration = (startIso: string, endIso: string) => {
    const mins = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));
    return t('studentContest.durationMinutes', { count: mins });
  };

  const activeUpcomingContests = filteredContests.filter((c) => c.status !== 'ended');
  const pastContests = filteredContests.filter((c) => c.status === 'ended');

  const renderContestCard = (contest: ContestDto) => (
    <div
      key={contest.id}
      role="button"
      tabIndex={0}
      onClick={() => openContest(contest.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void openContest(contest.id);
        }
      }}
      className="bg-(--ws-panel) border border-(--ws-border) rounded-md px-4 py-3.5 hover:bg-(--ws-hover) hover:border-(--ws-accent)/40 transition-colors cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${contest.status === 'running' ? 'bg-(--ws-ok-soft)' : 'bg-(--ws-warn-soft)'}`}>
            <Trophy size={16} className={contest.status === 'running' ? 'text-(--ws-ok)' : 'text-(--ws-warn)'} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold text-(--ws-text) truncate">{contest.title}</h3>
              {contest.visibility === 'private' && contest.classLabel && (
                <span className="text-[11px] font-medium text-(--ws-muted) bg-(--ws-panel2) border border-(--ws-border) rounded px-1.5 py-0.5">
                  {contest.classLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-(--ws-muted) mt-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${typeColors[contest.type ?? 'Homework']}`}>
                {contest.type ?? 'Homework'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-semibold bg-(--ws-panel2) text-(--ws-text) border-(--ws-border)">
                {visibilityLabels[contest.visibility ?? 'public']}
              </span>
              {contest.className && <span>{contest.className}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-end gap-0.5 text-xs text-(--ws-muted) font-mono tabular-nums">
            <span className="flex items-center gap-1">
              <Calendar size={12} aria-hidden="true" /> {formatVNFull(contest.startTime)}
            </span>
            <span className="flex items-center gap-2">
              <span>{formatDuration(contest.startTime, contest.endTime)}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={12} aria-hidden="true" /> {t('studentContest.peopleCount', { count: contest.participantCount ?? 0 })}
              </span>
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap ${statusColors[contest.status ?? 'upcoming']}`}>
            {statusLabels[contest.status ?? 'upcoming']}
          </span>
          <ChevronRight size={16} className="text-(--ws-muted)" aria-hidden="true" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 text-(--ws-text)">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-bold font-serif text-(--ws-text)">{t('nav.contest')}</h2>
        <div className="text-xs font-mono tabular-nums text-(--ws-ok) font-semibold">
          {t('studentContest.runningCount', { count: contests.filter((contest) => contest.status === 'running').length })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ws-muted)" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('instructorContest.searchPlaceholder')}
            className="w-full h-9 pl-9 pr-3 bg-(--ws-panel) border border-(--ws-border) rounded text-sm text-(--ws-text) placeholder-(--ws-faint) focus:outline-none focus:border-(--ws-accent)"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={filter === level}
              onClick={() => setFilter(level)}
              className={`h-9 px-3 rounded text-xs font-semibold transition-colors ${
                filter === level ? 'bg-(--ws-accent) text-(--ws-on-accent)' : 'bg-(--ws-panel) text-(--ws-text) hover:bg-(--ws-hover) border border-(--ws-border)'
              }`}
            >
              {level === 'all' ? t('instructorContest.filterAll') : statusLabels[level]}
            </button>
          ))}
        </div>
      </div>

      {selectedContest && selectedContestData && hasDocument && createPortal(
        <div className="fixed inset-0 bg-black/75 z-90 flex items-center justify-center p-4" onClick={() => setSelectedContest(null)}>
          <div role="dialog" aria-modal="true" aria-label={selectedContestData.title} className="bg-(--ws-panel) border border-(--ws-border) text-(--ws-text) rounded-lg w-full max-w-2xl max-h-[82vh] overflow-hidden shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--ws-border)">
              <h3 className="text-base font-serif font-bold text-(--ws-text)">{selectedContestData.title}{selectedContestData.visibility === 'private' && selectedContestData.classLabel && (<span className="ml-2 align-middle text-xs font-semibold text-(--ws-text) bg-(--ws-panel2) border border-(--ws-border) rounded px-2 py-0.5">{selectedContestData.classLabel}</span>)}</h3>
              <button aria-label={t('common.close')} onClick={() => setSelectedContest(null)} className="text-(--ws-muted) hover:text-(--ws-text)"><X size={18} aria-hidden="true" /></button>
            </div>
            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-5 border-b border-(--ws-border) bg-(--ws-panel2)">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'info'
                    ? 'border-(--ws-accent) text-(--ws-accent)'
                    : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                <BookOpen size={14} aria-hidden="true" /> {t('studentContest.infoTab')}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('leaderboard')}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'leaderboard'
                    ? 'border-(--ws-accent) text-(--ws-accent)'
                    : 'border-transparent text-(--ws-muted) hover:text-(--ws-text)'
                }`}
              >
                <Trophy size={14} aria-hidden="true" /> {t('studentContest.leaderboardTab')}
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(82vh-110px)]">
              {modalTab === 'info' ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusColors[selectedContestData.status ?? 'upcoming']}`}>
                      {statusLabels[selectedContestData.status ?? 'upcoming']}
                    </span>
                    {selectedContestData.visibility === 'private' ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                        <Lock size={10} aria-hidden="true" /> {t('studentContest.visibilityPrivateClass')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium bg-(--ws-info-soft) text-(--ws-info) border-(--ws-info)/35">
                        <Globe size={10} aria-hidden="true" /> {t('studentContest.visibilityPublic')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-(--ws-text) mb-5 leading-relaxed">
                    {selectedContestData.description ?? t('studentContest.descriptionFallback')}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 bg-(--ws-panel2)/50 rounded-md border border-(--ws-border)">
                      <div className="flex items-center gap-1.5 text-[11px] text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Calendar size={12} aria-hidden="true" /> {t('instructorContest.fieldStart')}
                      </div>
                      <p className="text-xs font-mono tabular-nums text-(--ws-text) font-semibold">{formatVNFull(selectedContestData.startTime)}</p>
                    </div>
                    <div className="p-3 bg-(--ws-panel2)/50 rounded-md border border-(--ws-border)">
                      <div className="flex items-center gap-1.5 text-[11px] text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Clock size={12} aria-hidden="true" /> {t('instructorContest.fieldEnd')}
                      </div>
                      <p className="text-xs font-mono tabular-nums text-(--ws-text) font-semibold">{formatVNFull(selectedContestData.endTime)}</p>
                    </div>
                    <div className="p-3 bg-(--ws-panel2)/50 rounded-md border border-(--ws-border)">
                      <div className="flex items-center gap-1.5 text-[11px] text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Users size={12} aria-hidden="true" /> {t('instructorContest.fieldParticipants')}
                      </div>
                      <p className="text-sm font-mono tabular-nums text-(--ws-text) font-semibold">{selectedContestData.participantCount ?? 0}</p>
                    </div>
                    <div className="p-3 bg-(--ws-panel2)/50 rounded-md border border-(--ws-border)">
                      <div className="flex items-center gap-1.5 text-[11px] text-(--ws-muted) mb-1 font-semibold uppercase tracking-wider">
                        <Trophy size={12} aria-hidden="true" /> {t('studentContest.problemCountLabel')}
                      </div>
                      <p className="text-sm font-mono tabular-nums text-(--ws-text) font-semibold">{selectedContestData.problemCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Registration / Status Banner */}
                  {selectedContestData.status === 'ended' ? (
                    <div className="mb-5 border border-(--ws-border) rounded-md bg-(--ws-panel2) p-3 flex items-center gap-2.5 text-xs text-(--ws-text)">
                      <Clock size={15} className="text-(--ws-muted) shrink-0" aria-hidden="true" />
                      <span>{t('studentContest.endedHint')}</span>
                    </div>
                  ) : !isRegistered(selectedContestData.id) ? (
                    <div className="mb-5 border border-(--ws-border) rounded-md bg-(--ws-panel2) p-4">
                      <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-1">{t('studentContest.registerTitle')}</h4>
                      <p className="text-xs text-(--ws-muted) mb-3">
                        {selectedContestData.visibility === 'private'
                          ? t('studentContest.privateClassAddedHint')
                          : t('studentContest.publicHint')}
                      </p>
                      <button
                        type="button"
                        onClick={() => registerForContest(selectedContestData)}
                        className="w-full py-2 bg-(--ws-accent) text-(--ws-on-accent) text-sm font-semibold rounded hover:bg-(--ws-accent-strong) transition-colors"
                      >
                        {selectedContestData.status === 'running' ? t('studentContest.joinContestBtn') : t('studentContest.registerContestBtn')}
                      </button>
                    </div>
                  ) : selectedContestData.status === 'upcoming' ? (
                    <div className="mb-5 p-3 bg-(--ws-ok-soft) border border-(--ws-ok)/35 text-(--ws-ok) text-xs font-semibold rounded-md flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} className="text-(--ws-ok) shrink-0" aria-hidden="true" />
                      <span>{t('studentContest.registeredHint')}</span>
                    </div>
                  ) : null}

                  {/* Problem list: chỉ hiện khi cuộc thi đang diễn ra (và đã đăng ký); chưa bắt đầu hoặc đã kết thúc thì ẩn */}
                  {isRegistered(selectedContestData.id) && selectedContestData.status === 'running' && (
                    <div className="mb-2">
                      <h4 className="text-sm font-bold font-serif text-(--ws-text) mb-2.5 flex items-center gap-2">
                        <BookOpen size={14} aria-hidden="true" /> {t('studentContest.problemsInContest')}
                      </h4>
                      {loadingProblems ? (
                        <div className="rounded-md border border-(--ws-border) divide-y divide-(--ws-border-soft)">
                          {Array.from({ length: 3 }, (_, idx) => (
                            <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                              <div className="h-3.5 w-48 rounded ws-skeleton" />
                              <div className="h-6 w-20 rounded ws-skeleton" />
                            </div>
                          ))}
                        </div>
                      ) : contestProblems.length === 0 ? (
                        <div className="bg-(--ws-panel2) border border-(--ws-border) rounded-md p-6 text-center text-sm text-(--ws-muted)">
                          {t('studentContest.emptyState')}
                        </div>
                      ) : (
                        <div className="rounded-md border border-(--ws-border) divide-y divide-(--ws-border-soft)">
                          {contestProblems.map((cp, i) => {
                            const diffColor: Record<string, string> = { EASY: 'bg-(--ws-ok-soft) text-(--ws-ok)', MEDIUM: 'bg-(--ws-warn-soft) text-(--ws-warn)', HARD: 'bg-(--ws-danger-soft) text-(--ws-danger)', Easy: 'bg-(--ws-ok-soft) text-(--ws-ok)', Medium: 'bg-(--ws-warn-soft) text-(--ws-warn)', Hard: 'bg-(--ws-danger-soft) text-(--ws-danger)' };
                            return (
                              <div key={cp.problem_id} className="flex items-center gap-3 px-3.5 py-2.5 bg-(--ws-panel) hover:bg-(--ws-hover) transition-colors">
                                <span className="text-xs font-mono tabular-nums text-(--ws-muted) w-5 text-center">{i + 1}</span>
                                <p className="flex-1 text-sm font-medium text-(--ws-text) truncate">{cp.problem.title}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${diffColor[cp.problem.difficulty] ?? 'bg-(--ws-panel2) text-(--ws-muted)'}`}>
                                  {difficultyLabels[cp.problem.difficulty] ?? cp.problem.difficulty}
                                </span>
                                <Link
                                  to={`/student/contest/${selectedContestData.id}/problem/${cp.problem_id}`}
                                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-(--ws-accent) text-(--ws-on-accent) text-xs font-semibold rounded hover:bg-(--ws-accent-strong) transition-colors"
                                  onClick={() => setSelectedContest(null)}
                                >
                                  <Play size={11} fill="currentColor" aria-hidden="true" /> {t('studentHomework.goSolve')}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-(--ws-border)">
                    <h4 className="text-sm font-bold font-serif text-(--ws-text) flex items-center gap-2">
                      <Trophy size={15} className="text-(--ws-warn)" aria-hidden="true" /> {t('studentContest.leaderboardTab')}
                    </h4>
                    <span className="text-xs font-mono tabular-nums text-(--ws-muted)">
                      {t('studentContest.peopleCount', { count: leaderboard.length })}
                    </span>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="rounded-md border border-(--ws-border) divide-y divide-(--ws-border-soft)">
                      {Array.from({ length: 5 }, (_, idx) => (
                        <div key={idx} className="px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="h-3.5 w-6 rounded ws-skeleton" />
                          <div className="h-3.5 flex-1 max-w-44 rounded ws-skeleton" />
                          <div className="h-3.5 w-24 rounded ws-skeleton" />
                        </div>
                      ))}
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center bg-(--ws-panel2) border border-(--ws-border) rounded-md">
                      <Trophy size={32} className="text-(--ws-faint) mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm font-semibold text-(--ws-text)">{t('studentContest.emptyLeaderboard')}</p>
                      <p className="text-xs text-(--ws-muted) mt-1">{t('studentContest.leaderboardUpdateHint')}</p>
                    </div>
                  ) : (
                    <div className="bg-(--ws-panel2) rounded-md border border-(--ws-border) overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-(--ws-border) bg-(--ws-hover) text-[11px] font-semibold text-(--ws-muted) uppercase tracking-wider">
                            <th className="text-left py-2 px-3">#</th>
                            <th className="text-left py-2 px-3">{t('instructorContest.colUser')}</th>
                            <th className="text-right py-2 px-3">{t('instructorContest.colSolved')}</th>
                            <th className="text-right py-2 px-3">{t('instructorContest.colScore')}</th>
                            <th className="text-right py-2 px-3">{t('instructorContest.colRuntime')}</th>
                            <th className="text-right py-2 px-3">{t('instructorContest.colPenalty')}</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {leaderboard.map((s: any) => (
                            <tr key={s.user_id ?? s.rank} className="border-b last:border-b-0 border-(--ws-border) hover:bg-(--ws-hover)">
                              <td className="py-2 px-3 font-mono tabular-nums text-(--ws-muted)">{s.rank}</td>
                              <td className="py-2 px-3 text-(--ws-text) font-medium">{s.fullName ?? s.username ?? s.email}</td>
                              <td className="py-2 px-3 font-mono tabular-nums text-(--ws-ok) font-bold text-right">{s.solvedCount ?? s.solved}/{selectedContestData.problemCount ?? 0}</td>
                              <td className="py-2 px-3 font-mono tabular-nums text-(--ws-text) font-bold text-right">{s.score ?? 0}</td>
                              <td className="py-2 px-3 font-mono tabular-nums text-(--ws-muted) text-right">{s.score ? `${s.runtime ?? 0} ms` : '—'}</td>
                              <td className="py-2 px-3 font-mono tabular-nums text-(--ws-muted) text-right">{s.penalty ?? '—'}</td>
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

      {filteredContests.length === 0 ? (
        <div className="bg-(--ws-panel) border border-(--ws-border) rounded-md p-10 text-center">
          <Trophy size={40} className="text-(--ws-faint) mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-(--ws-muted)">{t('studentContest.emptyState')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {activeUpcomingContests.length > 0 && (
            <section className="space-y-2.5">
              {filter === 'all' && pastContests.length > 0 && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--ws-muted)">
                  {t('studentContest.sectionActiveUpcoming')}
                </h3>
              )}
              <div className="space-y-2.5">
                {activeUpcomingContests.map(renderContestCard)}
              </div>
            </section>
          )}

          {pastContests.length > 0 && (
            <section className="space-y-2.5">
              {filter === 'all' && activeUpcomingContests.length > 0 && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--ws-muted)">
                  {t('studentContest.sectionPast')}
                </h3>
              )}
              <div className="rounded-md border border-(--ws-border) bg-(--ws-panel) overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="h-9 border-b border-(--ws-border) bg-(--ws-panel2)/70 text-[11px] font-semibold uppercase tracking-wider text-(--ws-muted)">
                        <th scope="col" className="px-3 py-2">{t('nav.contest')}</th>
                        <th scope="col" className="px-3 py-2 hidden sm:table-cell">{t('instructorContest.fieldStart')}</th>
                        <th scope="col" className="px-3 py-2 text-right hidden md:table-cell">{t('studentContest.colDuration')}</th>
                        <th scope="col" className="px-3 py-2 text-right">{t('instructorContest.fieldParticipants')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastContests.map((contest) => (
                        <tr
                          key={contest.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openContest(contest.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void openContest(contest.id);
                            }
                          }}
                          className="h-11 border-b last:border-b-0 border-(--ws-border-soft) hover:bg-(--ws-hover) cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-(--ws-text) truncate">{contest.title}</span>
                              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${typeColors[contest.type ?? 'Homework']}`}>
                                {contest.type ?? 'Homework'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle font-mono tabular-nums text-xs text-(--ws-muted) whitespace-nowrap hidden sm:table-cell">
                            {formatVNFull(contest.startTime)}
                          </td>
                          <td className="px-3 py-2 align-middle text-right font-mono tabular-nums text-xs text-(--ws-muted) whitespace-nowrap hidden md:table-cell">
                            {formatDuration(contest.startTime, contest.endTime)}
                          </td>
                          <td className="px-3 py-2 align-middle text-right font-mono tabular-nums text-xs text-(--ws-muted) whitespace-nowrap">
                            {contest.participantCount ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}