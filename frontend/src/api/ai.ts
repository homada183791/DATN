import { apiFetch } from './http';

export interface TutorHintRequest {
  problem_id: string;
  current_code: string;
  language: string;
  hint_type?: 'HINT' | 'COMPLEXITY' | 'EDGE_CASE' | 'EXPLAIN_LOGIC';
  contest_id?: string;
}

export interface TutorHintResponse {
  success: boolean;
  hint_type: string;
  problem_id: string;
  problem_title: string;
  response: string;
  created_at: string;
}

export interface GenerateTestCasesRequest {
  problem_id?: string;
  title?: string;
  description?: string;
  solution_code?: string;
  language?: string;
  count?: number;
  strategy?: 'FROM_DESCRIPTION' | 'FROM_SOLUTION';
}

export interface GeneratedTestCaseItem {
  input: string;
  expected_output: string;
  is_hidden: boolean;
  explanation?: string;
}

export interface GenerateTestCasesResponse {
  success: boolean;
  strategy: string;
  count: number;
  test_cases: GeneratedTestCaseItem[];
}

export interface ExplainErrorRequest {
  submission_id: string;
}

export interface ExplainErrorResponse {
  success: boolean;
  submission_id: string;
  status: string;
  problem_title: string;
  analysis: string;
}

export async function getAiTutorHint(data: TutorHintRequest): Promise<TutorHintResponse> {
  return apiFetch<TutorHintResponse>('/api/v1/ai/tutor-hint', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateAiTestCases(data: GenerateTestCasesRequest): Promise<GenerateTestCasesResponse> {
  return apiFetch<GenerateTestCasesResponse>('/api/v1/ai/generate-testcases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function explainSubmissionError(data: ExplainErrorRequest): Promise<ExplainErrorResponse> {
  return apiFetch<ExplainErrorResponse>('/api/v1/ai/explain-error', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
