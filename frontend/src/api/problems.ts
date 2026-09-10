import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export type ProblemDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface ProblemDto {
  id: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  time_limit: number;
  memory_limit: number;
  created_at: string;
  updated_at: string;
  test_cases?: Array<{
    id: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
}

export function fetchProblems() {
  return apiFetch<ProblemDto[]>('/api/v1/problems');
}

export function fetchProblem(id: string) {
  return apiFetch<ProblemDto>(`/api/v1/problems/${id}`);
}

export interface CreateTestCaseDto {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface CreateProblemDto {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  time_limit: number;
  memory_limit: number;
  test_cases: CreateTestCaseDto[];
}

export function createProblem(data: CreateProblemDto) {
  return apiFetch<ProblemDto>('/api/v1/problems', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProblem(id: string, data: Partial<CreateProblemDto>) {
  return apiFetch<ProblemDto>(`/api/v1/problems/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteProblem(id: string) {
  return apiFetch<void>(`/api/v1/problems/${id}`, { method: 'DELETE' });
}

export function useProblemsQuery() {
  return useQuery({ 
    queryKey: ['problems'], 
    queryFn: fetchProblems,
    enabled: !!window.localStorage.getItem('accessToken')
  });
}

export function useProblemQuery(id?: string) {
  return useQuery({
    queryKey: ['problems', id],
    queryFn: () => fetchProblem(id ?? ''),
    enabled: !!id,
  });
}
