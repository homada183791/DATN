import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export type TestGenKind = 'random' | 'edge' | 'adversarial';
export type TestGenStatus = 'PENDING' | 'REFERENCE' | 'GENERATORS' | 'INPUTS' | 'CHECKING' | 'DONE' | 'FAILED';

export interface TestGenCandidate {
  id: string;
  kind: TestGenKind;
  generator: string;
  input: string;
  expected_output: string;
  input_bytes: number;
  output_bytes: number;
  reference_time_ms: number;
  heavy: boolean;
  breaks: Array<{ submission_id: string; verdict: string }>;
}

export interface TestGenGenerator {
  kind: TestGenKind;
  name: string;
  description: string;
  count: number;
  code: string;
  produced: number;
  error?: string;
}

export interface TestGenJob {
  id: string;
  problem_id: string;
  status: TestGenStatus;
  error: string | null;
  reference_language: string;
  generators: TestGenGenerator[];
  candidates: TestGenCandidate[];
  summary: {
    generated?: number;
    kept?: number;
    dropped?: number;
    accepted_checked?: number;
    accepted_broken?: number;
    existing_tests?: number;
  };
  applied_count: number;
  created_at: string;
}

export const isTestGenRunning = (s?: TestGenStatus) => !!s && s !== 'DONE' && s !== 'FAILED';

export function useLatestTestGen(problemId: string) {
  return useQuery({
    queryKey: ['testgen', 'latest', problemId],
    queryFn: () => apiFetch<TestGenJob | null>(`/api/v1/testgen/problems/${problemId}/latest`),
  });
}

/** Hỏi lại mỗi 2 giây khi lượt sinh test còn đang chạy. */
export function useTestGenJob(jobId: string | null) {
  return useQuery({
    queryKey: ['testgen', 'job', jobId],
    queryFn: () => apiFetch<TestGenJob>(`/api/v1/testgen/jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (q) => (isTestGenRunning(q.state.data?.status) ? 2000 : false),
  });
}

export function useStartTestGen(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      reference_language: string;
      reference_version?: string;
      reference_code: string;
      random_count: number;
      edge_count: number;
      adversarial_count: number;
    }) =>
      apiFetch<TestGenJob>(`/api/v1/testgen/problems/${problemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: (job) => qc.setQueryData(['testgen', 'job', job.id], job),
  });
}

export function useApplyTestGen(jobId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidate_ids: string[]) =>
      apiFetch<{ added: number; skipped_duplicates: number }>(`/api/v1/testgen/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_ids }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testgen', 'job', jobId] });
      qc.invalidateQueries({ queryKey: ['problems'] });
    },
  });
}
