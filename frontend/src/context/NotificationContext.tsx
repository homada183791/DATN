import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSocket } from '../api/socket';
import {
  type Notification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notifications';
import { useAuth } from './AuthContext';
import type { Socket } from 'socket.io-client';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const PAGE_SIZE = 20;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const hasFetched = useRef(false);

  const hasMore = notifications.length < total;

  // ─── Fetch initial notifications ──────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetchNotifications(PAGE_SIZE, 0);
      setNotifications(res.notifications);
      setUnreadCount(res.unread);
      setTotal(res.total);
      setOffset(res.notifications.length);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !hasFetched.current) {
      hasFetched.current = true;
      fetchInitial();
    }
    if (!isAuthenticated) {
      hasFetched.current = false;
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
      setOffset(0);
    }
  }, [isAuthenticated, fetchInitial]);

  // ─── Load more (pagination) ────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetchNotifications(PAGE_SIZE, offset);
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newOnes = res.notifications.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newOnes];
      });
      setOffset((prev) => prev + res.notifications.length);
      setTotal(res.total);
      setUnreadCount(res.unread);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset]);

  // ─── Mark single as read ───────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // silent fail
    }
  }, [qc]);

  // ─── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // silent fail
    }
  }, [qc]);

  // ─── Delete notification ───────────────────────────────────────────────────
  const removeNotification = useCallback(async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setTotal((prev) => Math.max(0, prev - 1));
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // silent fail
    }
  }, [notifications, qc]);

  // ─── WebSocket: join user room + listen for new notifications ─────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join per-user notification room
      socket.emit('join_user_room', { user_id: user.id });
    });

    socket.on('notification_received', (notification: Notification) => {
      // Prepend new notification to list
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      setTotal((prev) => prev + 1);
      // Invalidate cache so other components stay in sync
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id, qc]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markRead,
        markAllRead,
        removeNotification,
        loadMore,
        hasMore,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
