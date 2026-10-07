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
import { notifyGlobalToast } from './ToastContext';
import type { Socket } from 'socket.io-client';

function playNotificationSound(type: 'success' | 'alert' | 'default' = 'default') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(415.3, now);
      osc.frequency.setValueAtTime(349.23, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // AudioContext blocked before interaction; fail silently
  }
}

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
      qc.invalidateQueries({ queryKey: ['submissions'] });

      // Trigger toast popup banner & sound
      const titleLower = (notification.title || '').toLowerCase();
      const bodyLower = (notification.body || '').toLowerCase();
      const text = `${titleLower} ${bodyLower}`;

      const isSuccess =
        text.includes('accepted') ||
        text.includes('chấp nhận') ||
        text.includes('100/100') ||
        text.includes('hoàn thành');
      const isError =
        text.includes('wrong answer') ||
        text.includes('time limit') ||
        text.includes('compile error') ||
        text.includes('runtime error') ||
        text.includes('sai') ||
        text.includes('lỗi');

      playNotificationSound(isSuccess ? 'success' : isError ? 'alert' : 'default');

      const toastMessage = notification.body
        ? `${notification.title}\n${notification.body}`
        : notification.title;

      notifyGlobalToast(toastMessage, isSuccess ? 'success' : isError ? 'error' : 'info', 4500);
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
