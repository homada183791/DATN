import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export type SubmissionStatus =
  | 'PENDING'
  | 'IN_QUEUE'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR';

export interface SubmissionDto {
  id: string;
  problem_id: string;
  problem_title: string;
  user_id: string;
  username: string;
  language: string;
  status: SubmissionStatus;
  execution_time: number | null;
  memory_used: number | null;
  source_code: string;
  created_at: string;
}

export function fetchSubmissions(problemId?: string) {
  const url = problemId ? `/api/v1/submissions?problem_id=${encodeURIComponent(problemId)}` : '/api/v1/submissions';
  return apiFetch<SubmissionDto[]>(url);
}

export function useSubmissionsQuery() {
  return useQuery({ 
    queryKey: ['submissions'], 
    queryFn: () => fetchSubmissions(),
    enabled: !!window.localStorage.getItem('accessToken')
  });
}

export function useProblemSubmissionsQuery(problemId?: string) {
  return useQuery({
    queryKey: ['submissions', 'problem', problemId],
    queryFn: () => fetchSubmissions(problemId),
    enabled: !!problemId && !!window.localStorage.getItem('accessToken'),
  });
}
