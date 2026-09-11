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

export function fetchSubmissions() {
  return apiFetch<SubmissionDto[]>('/api/v1/submissions');
}

export function useSubmissionsQuery() {
  return useQuery({ 
    queryKey: ['submissions'], 
    queryFn: fetchSubmissions,
    enabled: !!window.localStorage.getItem('accessToken')
  });
}
