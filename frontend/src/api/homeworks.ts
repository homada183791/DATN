import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface HomeworkTaskDto {
  id: string;
  title: string;
  statement: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  sampleInput?: string;
  sampleOutput?: string;
  /** ID của bài toán trong Problem Bank (nếu có) → cho phép SV navigate sang /student/problem/:problem_id */
  problem_id?: string;
}

export interface HomeworkDto {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  class_id: string;
  tasks: HomeworkTaskDto[];
  class?: {
    id: string;
    name: string;
    invite_code: string;
    students?: Array<{ student_id: string }>;
  };
}

export function fetchHomeworks() {
  return apiFetch<HomeworkDto[]>('/api/v1/homeworks');
}

export function createHomework(data: {
  title: string;
  description: string;
  deadline: string;
  class_id: string;
  tasks: HomeworkTaskDto[];
}) {
  return apiFetch<HomeworkDto>('/api/v1/homeworks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHomework(id: string, data: Partial<Parameters<typeof createHomework>[0]>) {
  return apiFetch<HomeworkDto>(`/api/v1/homeworks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteHomework(id: string) {
  return apiFetch<void>(`/api/v1/homeworks/${id}`, { method: 'DELETE' });
}

export function useHomeworksQuery() {
  return useQuery({ 
    queryKey: ['homeworks'], 
    queryFn: fetchHomeworks,
    enabled: typeof window !== 'undefined' && !!window.localStorage.getItem('accessToken'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useHomeworkMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['homeworks'] });
    await queryClient.refetchQueries({ queryKey: ['homeworks'] });
  };
  return {
    create: async (data: Parameters<typeof createHomework>[0]) => {
      const result = await createHomework(data);
      await invalidate();
      return result;
    },
    update: async (id: string, data: Partial<Parameters<typeof createHomework>[0]>) => {
      const result = await updateHomework(id, data);
      await invalidate();
      return result;
    },
    remove: async (id: string) => {
      await deleteHomework(id);
      await invalidate();
    },
  };
}

// ─── Class-scoped homework endpoints ─────────────────────────────────────────

/** GET /api/v1/classes/:classId/homeworks */
export function fetchClassHomeworks(classId: string) {
  return apiFetch<HomeworkDto[]>(`/api/v1/classes/${classId}/homeworks`);
}

/** GET /api/v1/classes/:classId/homeworks/:homeworkId */
export function fetchClassHomework(classId: string, homeworkId: string) {
  return apiFetch<HomeworkDto>(`/api/v1/classes/${classId}/homeworks/${homeworkId}`);
}

export function useClassHomeworksQuery(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-homeworks', classId],
    queryFn: () => fetchClassHomeworks(classId!),
    enabled: !!classId && !!window.localStorage.getItem('accessToken'),
  });
}

export function useClassHomeworkQuery(classId: string | undefined, homeworkId: string | undefined) {
  return useQuery({
    queryKey: ['class-homework', classId, homeworkId],
    queryFn: () => fetchClassHomework(classId!, homeworkId!),
    enabled: !!classId && !!homeworkId && !!window.localStorage.getItem('accessToken'),
  });
}
