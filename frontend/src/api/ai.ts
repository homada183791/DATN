import { apiFetch } from './http';

export interface TutorHintRequest {
  problem_id: string;
  current_code: string;
  language: string;
  hint_type?: 'HINT' | 'COMPLEXITY' | 'EDGE_CASE' | 'EXPLAIN_LOGIC';
  contest_id?: string;
  /** 1 = gợi mở, 2 = chỉ chỗ sai, 3 = cách sửa. Bài tập có điểm chỉ mở dần từng mức. */
  level?: 1 | 2 | 3;
}

/** Thông tin chung backend trả về cho mỗi lượt hỏi AI. */
export interface AiMeta {
  interaction_id?: string | null;
  level?: 1 | 2 | 3;
  max_level?: 1 | 2 | 3;
  next_level_available?: boolean;
  /** practice = luyện tập (nói thẳng), homework = bài tập có điểm (gợi ý dần) */
  context?: 'practice' | 'homework';
  /** llm = AI trả lời, template = câu trả lời soạn sẵn (chưa cấu hình AI hoặc AI lỗi) */
  source?: 'llm' | 'template';
  remaining_quota?: number | null;
}

export interface TutorHintResponse extends AiMeta {
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

export interface ExplainErrorResponse extends AiMeta {
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

export async function sendAiFeedback(interactionId: string, value: 1 | -1): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/v1/ai/feedback', {
    method: 'POST',
    body: JSON.stringify({ interaction_id: interactionId, value }),
  });
}
