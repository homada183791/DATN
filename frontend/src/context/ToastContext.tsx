import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  /** Số lần thông báo giống hệt được gộp lại */
  count: number;
}

const MAX_VISIBLE = 4;

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const toastListeners = new Set<(message: string, type: ToastType, durationMs?: number) => void>();

export function notifyGlobalToast(message: string, type: ToastType = 'error', durationMs?: number) {
  toastListeners.forEach((listener) => listener(message, type, durationMs));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3200) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => {
      // Thông báo trùng (vd. nhiều request cùng bị 429) → gộp vào một, đếm số lần, không chồng cả cột
      const same = prev.find((x) => x.message === message && x.type === type);
      if (same) return prev.map((x) => (x === same ? { ...x, id, count: x.count + 1 } : x));
      return [...prev, { id, message, type, count: 1 }].slice(-MAX_VISIBLE);
    });

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, durationMs);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    const listener = (message: string, type: ToastType, durationMs?: number) => showToast(message, type, durationMs);
    toastListeners.add(listener);

    return () => {
      toastListeners.delete(listener);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Nền đặc, nằm trên mọi lớp (kể cả cửa sổ con) để đọc rõ */}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-2xl border px-4 py-3.5 shadow-xl text-sm font-medium animate-fade-in flex items-start gap-3 pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-emerald-950/15'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-blue-950/15'
                : 'bg-rose-50 text-rose-900 border-rose-300 shadow-rose-950/15'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            ) : toast.type === 'info' ? (
              <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <XCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex-1 min-w-0 leading-snug whitespace-pre-wrap">{toast.message}</div>
            {toast.count > 1 && (
              <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold tabular-nums">×{toast.count}</span>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
