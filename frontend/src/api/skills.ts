import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export type MasteryLevel = 'insufficient' | 'not_yet' | 'learning' | 'proficient' | 'mastered';

export interface SkillDto {
  id: string;
  code: string;
  name_vi: string;
  name_en: string;
  category: string;
  description: string | null;
  sort: number;
}

export interface ProblemSkillDto {
  code: string;
  name_vi: string;
  name_en: string;
  category: string;
  source: 'AI' | 'INSTRUCTOR' | string;
  approved: boolean;
  reason: string | null;
}

export interface StudentSkillDto {
  code: string;
  name_vi: string;
  name_en: string;
  category: string;
  p_mastery: number | null;
  attempts: number;
  correct: number;
  level: MasteryLevel;
}

export interface MySkillsDto {
  scope: string;
  params: { pInit: number; pLearn: number; pSlip: number; pGuess: number };
  skills: StudentSkillDto[];
  classes: Array<{ id: string; name: string; subject: string | null }>;
}

export interface SkillRecommendationDto {
  problem_id: string;
  title: string;
  difficulty: string;
  skill_code: string;
  skill_name_vi: string;
  skill_name_en: string;
  reason: 'weak' | 'new' | string;
}

export interface ClassHeatmapDto {
  class_id: string;
  class_name: string;
  problems: number;
  untagged_problems: number;
  skills: Array<{ code: string; name_vi: string; name_en: string; category: string; weight: number; class_avg: number | null }>;
  students: Array<{
    id: string;
    username: string;
    full_name: string | null;
    student_code: string | null;
    score10: number | null;
    cells: Record<string, { p: number; attempts: number; level: MasteryLevel; from: 'class' | 'global' | 'prior' }>;
  }>;
}

export interface SkillEvaluationDto {
  evaluated: number;
  students: number;
  tagged_problems: number;
  auc: number | null;
  accuracy: number | null;
  f1: number | null;
  positive_rate: number | null;
  majority_accuracy: number | null;
  learning_curve: Array<{ attempt: number; n: number; error_rate: number }>;
}

export const useSkillCatalogQuery = (enabled = true) =>
  useQuery({ queryKey: ['skills', 'catalog'], queryFn: () => apiFetch<SkillDto[]>('/api/v1/skills'), enabled, staleTime: 3_600_000 });

export const useProblemSkillsQuery = (problemId?: string) =>
  useQuery({
    queryKey: ['skills', 'problem', problemId],
    queryFn: () => apiFetch<ProblemSkillDto[]>(`/api/v1/skills/problems/${problemId}`),
    enabled: !!problemId,
  });

export function useSuggestProblemSkills(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ mode: 'ai' | 'keywords'; solutions_used: number; skills: ProblemSkillDto[] }>(
        `/api/v1/skills/problems/${problemId}/suggest`,
        { method: 'POST' },
      ),
    onSuccess: (data) => qc.setQueryData(['skills', 'problem', problemId], data.skills),
  });
}

export function useSetProblemSkills(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codes: string[]) =>
      apiFetch<ProblemSkillDto[]>(`/api/v1/skills/problems/${problemId}`, {
        method: 'PUT',
        body: JSON.stringify({ codes }),
      }),
    onSuccess: (data) => qc.setQueryData(['skills', 'problem', problemId], data),
  });
}

export const useMySkillsQuery = (scope = 'global') =>
  useQuery({
    queryKey: ['skills', 'me', scope],
    queryFn: () => apiFetch<MySkillsDto>(`/api/v1/skills/me?scope=${encodeURIComponent(scope)}`),
  });

export const useSkillRecommendationsQuery = () =>
  useQuery({
    queryKey: ['skills', 'me', 'recommendations'],
    queryFn: () => apiFetch<SkillRecommendationDto[]>('/api/v1/skills/me/recommendations'),
  });

export const useClassSkillHeatmapQuery = (classId?: string, enabled = true) =>
  useQuery({
    queryKey: ['skills', 'class', classId],
    queryFn: () => apiFetch<ClassHeatmapDto>(`/api/v1/skills/classes/${classId}/heatmap`),
    enabled: !!classId && enabled,
  });

export const fetchSkillEvaluation = () => apiFetch<SkillEvaluationDto>('/api/v1/skills/evaluation');
export const recomputeSkills = () => apiFetch<SkillEvaluationDto>('/api/v1/skills/recompute', { method: 'POST' });

/** { problemId: [mã kỹ năng đã duyệt] } — dùng để hiện nhãn và lọc trong Kho bài tập. */
export const useProblemSkillMapQuery = (enabled = true) =>
  useQuery({
    queryKey: ['skills', 'problem-map'],
    queryFn: () => apiFetch<Record<string, string[]>>('/api/v1/skills/problem-map'),
    enabled,
    staleTime: 300_000,
  });
