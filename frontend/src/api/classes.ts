import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface ClassDto {
  id: string;
  name: string;
  description?: string | null;
  invite_code: string;
  admin?: { id: string; email: string };
  students?: Array<{ student: { id: string; email: string } }>;
}

export function fetchClasses() {
  return apiFetch<ClassDto[]>('/api/v1/classes');
}

export function useClassesQuery() {
  return useQuery({ queryKey: ['classes'], queryFn: fetchClasses });
}