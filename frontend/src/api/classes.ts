import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface ClassDto {
  id: string;
  name: string;
  description?: string | null;
  semester?: string | null;
  invite_code: string;
  admin?: { id: string; email: string };
  students?: Array<{ student: { id: string; email: string } }>;
}

export function fetchClasses() {
  return apiFetch<ClassDto[]>('/api/v1/classes');
}

export function createClass(data: { name: string; semester?: string; description?: string }) {
  return apiFetch<ClassDto>('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify(data),
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