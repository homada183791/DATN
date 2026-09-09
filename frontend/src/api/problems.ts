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
