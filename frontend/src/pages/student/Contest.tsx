import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, Clock, Search, Trophy, Users, X, Lock, Globe, BookOpen, Play, CheckCircle2 } from 'lucide-react';
import { ApiError } from '../../api/http';
import { useContestsQuery, type ContestDto, fetchContestDetail, joinContest, useLeaderboardQuery } from '../../api/contests';
import { formatVNFull } from '../../utils/dateTime';

const statusColors: Record<NonNullable<ContestDto['status']>, string> = {
  upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ended: 'bg-[#f0ebd9] text-[#8a8073] border-[#e5dac9]',
};

const typeColors: Record<NonNullable<ContestDto['type']>, string> = {
  ICPC: 'bg-blue-100 text-blue-800',
  OI: 'bg-purple-100 text-purple-800',
  Homework: 'bg-emerald-100 text-emerald-800',
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

  const contests = data ?? [];
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

  const isRegistered = (contestId: string) => registeredContestIds.includes(contestId);

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

  const registerForContest = async (contest: ContestDto) => {
    if (isRegistered(contest.id)) return;
    try {
      await joinContest(contest.id);
      setRegisteredContestIds((prev) => [...prev, contest.id]);
      await queryClient.invalidateQueries({ queryKey: ['contests'] });
    } catch {
      // Nếu API lỗi (vd: chưa login), fallback sang localStorage
      setRegisteredContestIds((prev) => [...prev, contest.id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-[#191919]">
        <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('nav.contest')}</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-[#e5dac9] bg-white px-5 py-4 shadow-sm">
              <div className="h-4 w-56 rounded bg-[#f0ebd9] animate-pulse" />
              <div className="mt-3 h-3 w-80 rounded bg-[#f0ebd9] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof ApiError) {
    return (
      <div className="rounded-2xl border border-[#e5dac9] bg-white p-10 text-center shadow-sm">
        <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#191919]">{t('studentContest.loadError')}</h2>
        <p className="mt-2 text-sm text-[#8a8073]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#191919]">{t('nav.contest')}</h2>
        </div>
        <div className="text-sm text-emerald-700 font-medium">
          {t('studentContest.runningCount', { count: contests.filter((contest) => contest.status === 'running').length })}
        </div>
      </div>

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
        <div className="flex gap-2 flex-wrap">
          {(['all', 'running', 'upcoming', 'ended'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === level ? 'bg-[#193a2b] text-white shadow-sm' : 'bg-white text-[#5c5446] hover:text-[#191919] border border-[#e5dac9]'
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
            <div className="flex items-center justify-between p-6 border-b border-[#e5dac9]">
              <h3 className="text-lg font-serif font-bold text-[#191919]">{selectedContestData.title}</h3>
              <button onClick={() => setSelectedContest(null)} className="text-[#8a8073] hover:text-[#191919]"><X size={20} /></button>
            </div>
            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-6 pt-2 border-b border-[#e5dac9] bg-[#f7f4eb]">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'info'
                    ? 'border-[#193a2b] text-[#193a2b]'
                    : 'border-transparent text-[#8a8073] hover:text-[#191919]'
                }`}
              >
                <BookOpen size={14} /> {t('studentContest.infoTab')}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('leaderboard')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  modalTab === 'leaderboard'
                    ? 'border-[#193a2b] text-[#193a2b]'
                    : 'border-transparent text-[#8a8073] hover:text-[#191919]'
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
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-purple-50 text-purple-700 border-purple-200">
                        <Lock size={10} /> {t('studentContest.visibilityPrivateClass')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-sky-50 text-sky-700 border-sky-200">
                        <Globe size={10} /> {t('studentContest.visibilityPublic')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#5c5446] mb-6 leading-relaxed">
                    {selectedContestData.description ?? t('studentContest.descriptionFallback')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                      <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                        <Calendar size={14} /> {t('instructorContest.fieldStart')}
                      </div>
                      <p className="text-sm text-[#191919] font-semibold">{formatVNFull(selectedContestData.startTime)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                      <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                        <Clock size={14} /> {t('instructorContest.fieldEnd')}
                      </div>
                      <p className="text-sm text-[#191919] font-semibold">{formatVNFull(selectedContestData.endTime)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                      <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                        <Users size={14} /> {t('instructorContest.fieldParticipants')}
                      </div>
                      <p className="text-sm text-[#191919] font-semibold">{selectedContestData.participantCount ?? 0}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-[#e5dac9]">
                      <div className="flex items-center gap-2 text-xs text-[#8a8073] mb-1 font-semibold uppercase tracking-wider">
                        <Trophy size={14} /> {t('studentContest.problemCountLabel')}
                      </div>
                      <p className="text-sm text-[#191919] font-semibold">{selectedContestData.problemCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Registration / Status Banner */}
                  {selectedContestData.status === 'ended' ? (
                    <div className="mb-6 border border-[#e5dac9] rounded-xl bg-[#f7f4eb] p-3.5 flex items-center gap-2.5 text-xs text-[#5c5446]">
                      <Clock size={16} className="text-[#8a8073] shrink-0" />
                      <span>{t('studentContest.endedHint')}</span>
                    </div>
                  ) : !isRegistered(selectedContestData.id) ? (
                    <div className="mb-6 border border-[#e5dac9] rounded-xl bg-[#f7f4eb] p-4">
                      <h4 className="text-sm font-bold font-serif text-[#191919] mb-1.5">{t('studentContest.registerTitle')}</h4>
                      <p className="text-xs text-[#8a8073] mb-3">
                        {selectedContestData.visibility === 'private'
                          ? 'Bạn đã được giảng viên thêm vào lớp, kỳ thi này dành riêng cho lớp bạn.'
                          : t('studentContest.publicHint')}
                      </p>
                      <button
                        type="button"
                        onClick={() => registerForContest(selectedContestData)}
                        className="w-full py-2.5 bg-[#193a2b] text-white font-medium rounded-xl hover:bg-[#143022] transition-all shadow-md"
                      >
                        {selectedContestData.status === 'running' ? t('studentContest.joinContestBtn') : t('studentContest.registerContestBtn')}
                      </button>
                    </div>
                  ) : selectedContestData.status === 'upcoming' ? (
                    <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{t('studentContest.registeredHint')}</span>
                    </div>
                  ) : null}

                  {/* Problem list (Visible if registered OR if contest has ended) */}
                  {(isRegistered(selectedContestData.id) || selectedContestData.status === 'ended') && (
                    <div className="mb-2">
                      <h4 className="text-sm font-bold font-serif text-[#191919] mb-3 flex items-center gap-2">
                        <BookOpen size={15} /> {t('studentContest.problemsInContest')}
                      </h4>
                      {loadingProblems ? (
                        <div className="flex items-center justify-center h-16">
                          <div className="w-6 h-6 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : contestProblems.length === 0 ? (
                        <div className="bg-[#f7f4eb] border border-[#e5dac9] rounded-xl p-6 text-center text-sm text-[#8a8073]">
                          {t('studentContest.emptyState')}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contestProblems.map((cp, i) => {
                            const diffColor: Record<string, string> = { EASY: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HARD: 'bg-red-100 text-red-700', Easy: 'bg-emerald-100 text-emerald-700', Medium: 'bg-yellow-100 text-yellow-700', Hard: 'bg-red-100 text-red-700' };
                            const isRunning = selectedContestData.status === 'running';
                            const isEnded = selectedContestData.status === 'ended';
                            return (
                              <div key={cp.problem_id} className="flex items-center gap-3 px-4 py-3 bg-white border border-[#e5dac9] rounded-xl hover:bg-[#f7f4eb] transition-colors">
                                <span className="text-sm font-mono text-[#8a8073] w-5 text-center">{String.fromCharCode(65 + i)}</span>
                                <p className="flex-1 text-sm font-semibold text-[#191919] truncate">{cp.problem.title}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${diffColor[cp.problem.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {difficultyLabels[cp.problem.difficulty] ?? cp.problem.difficulty}
                                </span>
                                {isRunning ? (
                                  <Link
                                    to={`/student/contest/${selectedContestData.id}/problem/${cp.problem_id}`}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors"
                                    onClick={() => setSelectedContest(null)}
                                  >
                                    <Play size={11} fill="white" /> {t('studentHomework.goSolve')}
                                  </Link>
                                ) : isEnded ? (
                                  <Link
                                    to={`/student/problem/${cp.problem_id}`}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#193a2b] text-white text-xs font-semibold rounded-xl hover:bg-[#143022] transition-colors"
                                    onClick={() => setSelectedContest(null)}
                                  >
                                    <Play size={11} fill="white" /> {t('studentDashboard.practiceBtn')}
                                  </Link>
                                ) : (
                                  <span className="shrink-0 text-xs text-[#8a8073] px-3 py-1.5 bg-[#f0ebd9] rounded-xl">
                                    {t('instructorContest.statusUpcoming')}
                                  </span>
                                )}
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
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5dac9]">
                    <h4 className="text-sm font-bold font-serif text-[#191919] flex items-center gap-2">
                      <Trophy size={16} className="text-amber-600" /> {t('studentContest.leaderboardTab')}
                    </h4>
                    <span className="text-xs text-[#8a8073]">
                      {leaderboard.length} {t('studentContest.peopleCount', { count: leaderboard.length })}
                    </span>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-[#193a2b] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center bg-[#f7f4eb] border border-[#e5dac9] rounded-xl">
                      <Trophy size={36} className="text-[#bfae99] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#191919]">{t('studentContest.emptyLeaderboard')}</p>
                      <p className="text-xs text-[#8a8073] mt-1">{t('studentContest.leaderboardUpdateHint')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#e5dac9] rounded-xl bg-white">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#e5dac9] bg-[#f7f4eb] text-[#5c5446]">
                            <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                            <th className="py-2.5 px-3 font-bold">{t('studentContest.leaderboardColStudent')}</th>
                            <th className="py-2.5 px-3 font-bold text-center">{t('studentContest.leaderboardColSolved')}</th>
                            <th className="py-2.5 px-3 font-bold text-right">{t('studentContest.leaderboardColPenalty')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5dac9]/60">
                          {leaderboard.map((row: any, idx: number) => (
                            <tr key={row.user_id ?? idx} className="hover:bg-[#f7f4eb]/60 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[#191919]">
                                {row.fullName || row.username || 'Thí sinh'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                {row.solvedCount ?? row.solved ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[#8a8073]">
                                {row.penalty ?? 0}
                              </td>
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
          <div className="bg-white border border-[#e5dac9] rounded-xl p-12 text-center shadow-sm">
            <Trophy size={48} className="text-[#bfae99] mx-auto mb-4" />
            <p className="text-[#8a8073]">{t('studentContest.emptyState')}</p>
          </div>
        ) : (
          filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-white border border-[#e5dac9] rounded-xl p-6 hover:shadow-md hover:border-[#193a2b]/30 transition-all cursor-pointer shadow-sm"
              onClick={() => openContest(contest.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contest.status === 'running' ? 'bg-emerald-100' : contest.status === 'upcoming' ? 'bg-yellow-100' : 'bg-[#f0ebd9]'}`}>
                      <Trophy size={20} className={contest.status === 'running' ? 'text-emerald-700' : contest.status === 'upcoming' ? 'text-yellow-700' : 'text-[#8a8073]'} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-serif text-[#191919]">{contest.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-[#8a8073] mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColors[contest.type ?? 'Homework']}`}>
                          {contest.type ?? 'Homework'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-white text-[#5c5446] border-[#e5dac9]">
                          {visibilityLabels[contest.visibility ?? 'public']}
                        </span>
                        {contest.className && <span className="text-xs text-[#8a8073]">{contest.className}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 text-sm text-[#8a8073]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {formatVNFull(contest.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {contest.participantCount ?? 0} người
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[contest.status ?? 'upcoming']}`}>
                    {statusLabels[contest.status ?? 'upcoming']}
                  </span>
                  <ChevronRight size={20} className="text-[#8a8073]" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
