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
  /** "Môn học - Tên lớp" của lớp mà kỳ thi riêng tư thuộc về */
  classLabel?: string;
  /** Sinh viên hiện tại đã đăng ký kỳ thi này (từ server) */
  isRegistered?: boolean;
  /** Số lần được phép rời màn hình trước khi bị loại */
  maxCheatWarnings: number;
  /** Bật chế độ lockdown (toàn màn hình) khi thi */
  lockdownEnabled: boolean;
  /** Mã giám thị thoát lockdown sớm (chỉ instructor nhận được) */
  lockdownCode?: string;
}

interface ContestApiResponse {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  is_private: boolean;
  class_id?: string | null;
  class?: { name: string; subject?: string | null } | null;
  is_registered?: boolean;
  max_cheat_warnings?: number;
  lockdown_enabled?: boolean;
  lockdown_code?: string | null;
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
  /** Tổng điểm (điểm cao nhất mỗi bài) */
  score?: number;
  /** Tổng runtime (ms) của các bài nộp tốt nhất — dùng phá hòa khi bằng điểm */
  runtime?: number;
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
        isRegistered: contest.is_registered ?? false,
        maxCheatWarnings: contest.max_cheat_warnings ?? 3,
        lockdownEnabled: contest.lockdown_enabled ?? false,
        lockdownCode: contest.lockdown_code ?? undefined,
        participantCount: contest._count?.contest_sessions ?? 0,
        problemCount: contest._count?.problems ?? 0,
        type: 'ICPC',
        visibility: contest.is_private ? 'private' : 'public',
        classId: contest.class_id ?? undefined,
        classLabel: contest.class
          ? contest.class.subject
            ? `${contest.class.subject} - ${contest.class.name}`
            : contest.class.name
          : undefined,
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
  max_cheat_warnings?: number;
  lockdown_enabled?: boolean;
  lockdown_code?: string;
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

export function joinContest(contestId: string) {
  return apiFetch<{
    success: boolean;
    session_id: string;
    cheat_warnings?: number;
    is_disqualified?: boolean;
    max_warnings?: number;
    lockdown_enabled?: boolean;
    end_time?: string;
  }>(`/api/v1/contests/${contestId}/join`, { method: 'POST' });
}

/** Sinh viên nhập mã giám thị để thoát lockdown sớm */
export function verifyLockdownCode(contestId: string, code: string) {
  return apiFetch<{ valid: boolean }>(`/api/v1/contests/${contestId}/lockdown/verify`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export interface PlagiarismReportDto {
  id: string;
  contest_id: string;
  problem_id: string;
  similarity_score: number;
  created_at: string;
  problem?: { title: string };
  submission_1?: {
    user?: { email: string };
    created_at: string;
  };
  submission_2?: {
    user?: { email: string };
    created_at: string;
  };
}

export function calculateContestElo(contestId: string) {
  return apiFetch<any>(`/api/v1/contests/${contestId}/calculate-elo`, {
    method: 'POST',
  });
}

export interface ContestProblemResultDto {
  attempts: number;
  score: number;
  solved: boolean;
  solved_at_minutes: number | null;
  runtime: number | null;
  latest_submission_id?: string | null;
}

export interface ContestResultRowDto {
  rank: number;
  user_id: string;
  username: string;
  email: string;
  solved: number;
  penalty: number;
  score: number;
  runtime: number;
  cheat_warnings: number;
  is_disqualified: boolean;
  problems: Record<string, ContestProblemResultDto>;
}

export interface ContestResultsDto {
  contest: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    lockdown_enabled: boolean;
    max_cheat_warnings: number;
  };
  problems: Array<{ id: string; title: string }>;
  results: ContestResultRowDto[];
}

export function fetchContestResults(contestId: string) {
  return apiFetch<ContestResultsDto>(`/api/v1/contests/${contestId}/results`);
}

export type ViolationReason = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'OTHER';

export interface ContestSessionDto {
  student_id: string;
  username: string;
  full_name?: string | null;
  email: string;
  cheat_warnings: number;
  is_disqualified: boolean;
  updated_at: string;
  last_violation?: { reason: ViolationReason | string; at: string } | null;
}

export interface ContestViolationDto {
  id: string;
  student_id: string;
  username: string;
  reason: ViolationReason | string;
  problem_id: string | null;
  warnings_after: number;
  at: string;
}

/** Trạng thái trực tiếp của một sinh viên do backend gửi qua socket (contest_presence_*). */
export interface ContestPresenceDto {
  student_id: string;
  username: string;
  full_name: string | null;
  state: 'active' | 'away' | 'offline';
  problem_id: string | null;
  since: number;
  last_seen: number;
}

export function fetchContestViolations(contestId: string, limit = 150) {
  return apiFetch<ContestViolationDto[]>(`/api/v1/contests/${contestId}/violations?limit=${limit}`);
}

export function resetContestSession(contestId: string, studentId: string) {
  return apiFetch<{ success: boolean }>(`/api/v1/contests/${contestId}/sessions/${studentId}/reset`, { method: 'POST' });
}

export function fetchContestSessions(contestId: string) {
  return apiFetch<{ max_warnings: number; sessions: ContestSessionDto[] }>(`/api/v1/contests/${contestId}/sessions`);
}

export function fetchPlagiarismReports(contestId: string) {
  return apiFetch<PlagiarismReportDto[]>(`/api/v1/contests/${contestId}/plagiarism-reports`);
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