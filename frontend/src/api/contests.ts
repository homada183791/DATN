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
  return apiFetch<ContestDto[]>('/api/v1/contests');
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
