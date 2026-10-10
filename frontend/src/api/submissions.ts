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
  score?: number;
  instructor_score?: number | null;
  instructor_feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  execution_time: number | null;
  memory_used: number | null;
  source_code: string;
  created_at: string;
}

export interface SubmissionTestCaseResult {
  id: string;
  testcase_index: number;
  status: SubmissionStatus;
  execution_time: number | null;
  memory_used: number | null;
  is_hidden: boolean;
  input?: string;
  expected_output?: string;
  actual_output?: string;
}

export interface SubmissionDetailDto extends SubmissionDto {
  problem_difficulty?: string;
  email?: string;
  updated_at?: string;
  test_results?: SubmissionTestCaseResult[];
}

export function fetchSubmissions(problemId?: string) {
  const url = problemId ? `/api/v1/submissions?problem_id=${encodeURIComponent(problemId)}` : '/api/v1/submissions';
  return apiFetch<SubmissionDto[]>(url);
}

export function fetchSubmissionDetail(id: string) {
  return apiFetch<SubmissionDetailDto>(`/api/v1/submissions/${id}`);
}

export function gradeSubmission(id: string, data: { instructor_score: number; instructor_feedback?: string }) {
  return apiFetch<SubmissionDto>(`/api/v1/submissions/${id}/grade`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function rejudgeSubmission(id: string) {
  return apiFetch<{ success: boolean; message: string }>(`/api/v1/submissions/${id}/rejudge`, {
    method: 'POST',
  });
}

export function rejudgeProblem(problemId: string) {
  return apiFetch<{ success: boolean; message: string; count: number }>(`/api/v1/submissions/problem/${problemId}/rejudge`, {
    method: 'POST',
  });
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

export function useSubmissionDetailQuery(id?: string) {
  return useQuery({
    queryKey: ['submission', id],
    queryFn: () => fetchSubmissionDetail(id!),
    enabled: !!id && !!window.localStorage.getItem('accessToken'),
  });
}
