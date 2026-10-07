import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface ClassDto {
  id: string;
  name: string;
  description?: string | null;
  semester?: string | null;
  invite_code: string;
  admin?: { id: string; email: string; username?: string };
  students?: Array<{
    student: {
      id: string;
      email: string;
      username?: string | null;
      elo_rating?: number;
      _count?: { submissions?: number };
    };
  }>;
  homeworks?: Array<{ id: string }>;
  contests?: Array<{ id: string }>;
  _count?: {
    homeworks?: number;
    contests?: number;
  };
}

export interface ClassStudentItemDto {
  joined_at?: string;
  student: {
    id: string;
    email: string;
    username?: string | null;
    elo_rating?: number;
    created_at?: string;
    _count?: {
      submissions?: number;
    };
  };
}

export interface ClassDetailDto {
  id: string;
  name: string;
  description?: string | null;
  semester?: string | null;
  invite_code: string;
  admin?: { id: string; email: string; username?: string };
  students?: ClassStudentItemDto[];
  homeworks?: Array<{
    id: string;
    title: string;
    description?: string | null;
    deadline: string;
    tasks?: any;
    created_at?: string;
  }>;
  contests?: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  }>;
}

export function fetchClasses() {
  return apiFetch<ClassDto[]>('/api/v1/classes');
}

export function fetchClassDetail(classId: string) {
  return apiFetch<ClassDetailDto>(`/api/v1/classes/${classId}`);
}

export function useClassDetailQuery(classId?: string) {
  return useQuery({
    queryKey: ['classes', classId],
    queryFn: () => fetchClassDetail(classId!),
    enabled: !!classId && !!window.localStorage.getItem('accessToken'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function createClass(data: { name: string; semester?: string; description?: string }) {
  return apiFetch<ClassDto>('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateClass(classId: string, data: { name?: string; semester?: string; description?: string }) {
  return apiFetch<ClassDto>(`/api/v1/classes/${classId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function addStudentToClass(classId: string, email: string) {
  return apiFetch<any>(`/api/v1/classes/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

/** Tham gia lớp bằng mã mời — gọi thẳng API, không phụ thuộc cache */
export function joinClassByCode(code: string) {
  return apiFetch<{ class_id: string; student_id: string }>('/api/v1/classes/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function deleteClass(classId: string) {
  return apiFetch<void>(`/api/v1/classes/${classId}`, { method: 'DELETE' });
}

export function removeClassStudent(classId: string, studentId: string) {
  return apiFetch<void>(`/api/v1/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
}

export function useClassesQuery() {
  return useQuery({ 
    queryKey: ['classes'], 
    queryFn: fetchClasses,
    enabled: !!window.localStorage.getItem('accessToken'),
    staleTime: 0,               // Luôn refetch để tránh cache cũ sau khi bị kick khỏi lớp
    refetchOnWindowFocus: true,
  });
}

export interface ClassGradeItem {
  homework_id: string;
  homework_title: string;
  task_id: string;
  problem_id?: string;
  task_title: string;
  points: number;
  status: string;
  score: number;
  instructor_score?: number | null;
  instructor_feedback?: string | null;
  submission_id?: string | null;
  submitted_at?: string | null;
}

export interface ClassGradebookStudent {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  summary: {
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    final_score: number;
  };
  grades: ClassGradeItem[];
}

export interface ClassGradebookDto {
  class_id: string;
  class_name: string;
  total_students: number;
  total_homeworks: number;
  homework_columns: Array<{
    homework_id: string;
    homework_title: string;
    deadline: string;
    tasks: Array<{
      task_id: string;
      problem_id?: string;
      title: string;
      points: number;
    }>;
  }>;
  students: ClassGradebookStudent[];
}

export function fetchClassGradebook(classId: string) {
  return apiFetch<ClassGradebookDto>(`/api/v1/classes/${classId}/gradebook`);
}

export function useClassGradebookQuery(classId?: string) {
  return useQuery({
    queryKey: ['class_gradebook', classId],
    queryFn: () => fetchClassGradebook(classId!),
    enabled: !!classId && !!window.localStorage.getItem('accessToken'),
  });
}