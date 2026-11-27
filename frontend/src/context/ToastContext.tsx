import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

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

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3500) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, durationMs);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
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
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`min-w-[260px] w-full sm:w-auto max-w-[420px] rounded-xl border px-4 py-3 shadow-lg text-sm font-medium animate-slide-up flex items-start gap-3 pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-[color-mix(in_srgb,var(--ws-ok)_13%,var(--ws-panel))] text-(--ws-text) border-(--ws-ok)/40'
                : toast.type === 'info'
                ? 'bg-[color-mix(in_srgb,var(--ws-info)_13%,var(--ws-panel))] text-(--ws-text) border-(--ws-info)/40'
                : 'bg-[color-mix(in_srgb,var(--ws-danger)_13%,var(--ws-panel))] text-(--ws-text) border-(--ws-danger)/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-(--ws-ok) shrink-0 mt-0.5" aria-hidden="true" />
            ) : toast.type === 'info' ? (
              <AlertCircle size={18} className="text-(--ws-info) shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <XCircle size={18} className="text-(--ws-danger) shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex-1 min-w-0 leading-snug whitespace-pre-wrap">{toast.message}</div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Close"
              className="shrink-0 p-1 -mr-1 -mt-0.5 rounded-md text-(--ws-muted) hover:text-(--ws-text) hover:bg-(--ws-hover) transition-colors"
            >
              <X size={14} aria-hidden="true" />
            </button>
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
