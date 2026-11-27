import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export type TestGenKind = 'random' | 'edge' | 'adversarial';
export type TestGenStatus = 'PENDING' | 'SOLVING' | 'REFERENCE' | 'GENERATORS' | 'INPUTS' | 'CHECKING' | 'DONE' | 'FAILED';

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
  /** reference = lời giải mẫu của GV; both = 2 lời giải AI khớp nhau; fast = chỉ lời giải nhanh của AI (test lớn) */
  verified_by: 'reference' | 'both' | 'fast';
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

export interface TestGenSolutions {
  fast: { language: string; code: string };
  brute: { language: string; code: string };
  attempts: number;
  samples_checked: number;
  samples_source: 'instructor' | 'statement';
}

export interface TestGenJob {
  id: string;
  problem_id: string | null;
  mode: 'REFERENCE' | 'AI';
  status: TestGenStatus;
  solutions: TestGenSolutions | null;
  error: string | null;
  reference_language: string | null;
  generators: TestGenGenerator[];
  candidates: TestGenCandidate[];
  summary: {
    generated?: number;
    kept?: number;
    dropped?: number;
    accepted_checked?: number;
    accepted_broken?: number;
    existing_tests?: number;
    agree?: number;
    mismatch?: number;
    unverified?: number;
    draft?: boolean;
  };
  applied_count: number;
  created_at: string;
}

export const isTestGenRunning = (s?: TestGenStatus) => !!s && s !== 'DONE' && s !== 'FAILED';

export function useLatestTestGen(problemId: string | undefined) {
  return useQuery({
    queryKey: ['testgen', 'latest', problemId],
    queryFn: () => apiFetch<TestGenJob | null>(`/api/v1/testgen/problems/${problemId}/latest`),
    enabled: !!problemId,
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

export interface DraftSpec {
  title: string;
  description: string;
  time_limit: number;
  memory_limit: number;
  samples: Array<{ input: string; expected_output: string }>;
}

export interface StartTestGenBody {
  reference_language?: string;
  reference_version?: string;
  reference_code?: string;
  random_count: number;
  edge_count: number;
  adversarial_count: number;
}

/** problemId = bài đã lưu; không có problemId = sinh trong form tạo đề (gửi kèm draft). */
export function useStartTestGen(problemId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartTestGenBody & Partial<DraftSpec>) =>
      apiFetch<TestGenJob>(problemId ? `/api/v1/testgen/problems/${problemId}` : '/api/v1/testgen/draft', {
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

/** Lấy nguyên văn test đã chọn để thêm vào form tạo đề. */
export function exportTestGen(jobId: string, candidate_ids: string[]) {
  return apiFetch<Array<{ input: string; expected_output: string; is_hidden: boolean }>>(
    `/api/v1/testgen/jobs/${jobId}/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_ids }),
      signal: AbortSignal.timeout(60_000),
    },
  );
}
