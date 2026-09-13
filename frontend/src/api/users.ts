import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface MeDto {
  id: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR';
  elo_rating: number;
  current_streak: number;
  highest_streak: number;
  created_at: string;
}

export interface HeatmapDto {
  current_streak: number;
  highest_streak: number;
  last_active_date: string | null;
  activity_logs: Array<{ activity_date: string; submission_count: number }>;
}

export function fetchMe() {
  return apiFetch<MeDto>('/api/v1/users/me');
}

export function fetchHeatmap() {
  return apiFetch<HeatmapDto>('/api/v1/users/me/heatmap');
}

export function useMeQuery() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchMe,
    enabled: !!window.localStorage.getItem('accessToken'),
  });
}

export function useHeatmapQuery() {
  return useQuery({
    queryKey: ['users', 'me', 'heatmap'],
    queryFn: fetchHeatmap,
    enabled: !!window.localStorage.getItem('accessToken'),
  });
}