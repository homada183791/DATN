import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

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

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3200) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);

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
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-md text-sm font-medium animate-fade-in flex items-start gap-3 pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300 shadow-emerald-950/10'
                : toast.type === 'info'
                ? 'bg-blue-50/95 text-blue-900 border-blue-300 shadow-blue-950/10'
                : 'bg-rose-50/95 text-rose-900 border-rose-300 shadow-rose-950/10'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 leading-snug whitespace-pre-wrap">{toast.message}</div>
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
