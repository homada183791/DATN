import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface ContestDto {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'running' | 'ended';
  participantCount: number;
  problemCount: number;
  type: 'ICPC' | 'OI' | 'Homework';
  visibility: 'public' | 'private';
  accessCode?: string;
  classId?: string;
  className?: string;
}

interface ContestApiResponse {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  is_private: boolean;
  class_id?: string | null;
  _count?: {
    problems?: number;
    contest_sessions?: number;
  };
}

export interface LeaderboardEntryDto {
  rank: number;
  username: string;
  fullName: string;
  email: string;
  solved: number;
  solvedCount: number;
  penalty: number;
  rating: number;
  user_id: string;
}

export interface LeaderboardDto {
  contestId?: string;
  contestTitle?: string;
  updatedAt?: string;
  standings: LeaderboardEntryDto[];
}

export function fetchContests() {
  return apiFetch<ContestApiResponse[]>('/api/v1/contests').then((contests) =>
    contests.map((contest): ContestDto => {
      const now = Date.now();
      const startTime = new Date(contest.start_time).getTime();
      const endTime = new Date(contest.end_time).getTime();
      const status = now < startTime ? 'upcoming' : now <= endTime ? 'running' : 'ended';

      return {
        id: contest.id,
        title: contest.title,
        description: contest.description ?? '',
        startTime: contest.start_time,
        endTime: contest.end_time,
        status,
        participantCount: contest._count?.contest_sessions ?? 0,
        problemCount: contest._count?.problems ?? 0,
        type: 'ICPC',
        visibility: contest.is_private ? 'private' : 'public',
        classId: contest.class_id ?? undefined,
      };
    })
  );
}

export function createContest(data: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_private: boolean;
  class_id?: string;
}) {
  return apiFetch<ContestApiResponse>('/api/v1/contests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateContest(id: string, data: Partial<Parameters<typeof createContest>[0]>) {
  return apiFetch<ContestApiResponse>(`/api/v1/contests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteContest(id: string) {
  return apiFetch<void>(`/api/v1/contests/${id}`, { method: 'DELETE' });
}

export function fetchLeaderboard(contestId: string) {
  return apiFetch<LeaderboardEntryDto[]>(`/api/v1/contests/${contestId}/leaderboard`);
}

export function fetchContestDetail(contestId: string) {
  return apiFetch<{
    id: string; title: string; description?: string | null;
    start_time: string; end_time: string; is_private: boolean;
    class_id?: string | null;
    problems: Array<{ problem_id: string; problem: { id: string; title: string; difficulty: string } }>;
  }>(`/api/v1/contests/${contestId}`);
}

export function addProblemToContest(contestId: string, problemId: string) {
  return apiFetch<{ id: string; contest_id: string; problem_id: string }>(
    `/api/v1/contests/${contestId}/problems`,
    { method: 'POST', body: JSON.stringify({ problem_id: problemId }) }
  );
}

export function removeProblemFromContest(contestId: string, problemId: string) {
  return apiFetch<void>(`/api/v1/contests/${contestId}/problems/${problemId}`, { method: 'DELETE' });
}

export function useContestsQuery() {
  return useQuery({ 
    queryKey: ['contests'], 
    queryFn: fetchContests,
    enabled: !!window.localStorage.getItem('accessToken')
  });
}

export function useLeaderboardQuery(contestId?: string) {
  return useQuery({
    queryKey: ['contests', contestId, 'leaderboard'],
    queryFn: () => fetchLeaderboard(contestId ?? ''),
    enabled: !!contestId,
  });
}
