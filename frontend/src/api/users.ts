import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';

export interface TopRatedUserDto {
  id: string;
  username: string;
  email: string;
  elo_rating: number;
  current_streak: number;
  highest_streak: number;
  solved_count: number;
  created_at: string;
}

export function fetchTopRatedUsers(limit = 10) {
  return apiFetch<TopRatedUserDto[]>(`/api/v1/users/top-rated?limit=${limit}`);
}

export function useTopRatedUsersQuery(limit = 10) {
  return useQuery({
    queryKey: ['users', 'top-rated', limit],
    queryFn: () => fetchTopRatedUsers(limit),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
