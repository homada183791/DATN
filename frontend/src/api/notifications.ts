import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export type NotificationType =
  | 'submission_judged'
  | 'homework_assigned'
  | 'contest_starting_soon'
  | 'contest_started'
  | 'class_enrolled';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

export interface UnreadCountResponse {
  count: number;
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

export function fetchNotifications(limit = 20, offset = 0) {
  return apiFetch<NotificationsResponse>(
    `/api/v1/notifications?limit=${limit}&offset=${offset}`,
  );
}

export function fetchUnreadCount() {
  return apiFetch<UnreadCountResponse>('/api/v1/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiFetch<Notification>(`/api/v1/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiFetch<{ updated: number }>('/api/v1/notifications/read-all', {
    method: 'PATCH',
  });
}

export function deleteNotification(id: string) {
  return apiFetch<Notification>(`/api/v1/notifications/${id}`, {
    method: 'DELETE',
  });
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export function useNotificationsQuery(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['notifications', limit, offset],
    queryFn: () => fetchNotifications(limit, offset),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 15_000,
    refetchInterval: 60_000, // poll every 60s as fallback
    refetchOnWindowFocus: true,
  });
}

export function useMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
