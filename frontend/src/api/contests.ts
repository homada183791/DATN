import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface ContestDto {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  status?: 'upcoming' | 'running' | 'ended';
  participantCount?: number;
  problemCount?: number;
  type?: 'ICPC' | 'OI' | 'Homework';
  visibility?: 'public' | 'private';
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
}

export interface LeaderboardEntryDto {
  rank: number;
  username: string;
  fullName: string;
  solvedCount: number;
  rating: number;
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
        participantCount: 0,
        problemCount: 0,
        visibility: contest.is_private ? 'private' : 'public',
        classId: contest.class_id ?? undefined,
      };
    })
  );
}

export function fetchLeaderboard(contestId: string) {
  return apiFetch<LeaderboardDto | LeaderboardEntryDto[]>(`/api/v1/contests/${contestId}/leaderboard`);
}

export function useContestsQuery() {
  return useQuery({ queryKey: ['contests'], queryFn: fetchContests });
}

export function useLeaderboardQuery(contestId?: string) {
  return useQuery({
    queryKey: ['contests', contestId, 'leaderboard'],
    queryFn: () => fetchLeaderboard(contestId ?? ''),
    enabled: !!contestId,
  });
}
