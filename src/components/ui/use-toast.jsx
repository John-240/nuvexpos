import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

const TOAST_DURATION = 3000;
const DESTRUCTIVE_DURATION = 5000;
const FADE_DURATION = 300;
const TOAST_LIMIT = 3;

// Punto de montaje: el `toast` standalone delega aquí si el provider está activo.
let _push = null;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Marca el toast en cierre (fade-out) y lo remueve tras FADE_DURATION
  const dismiss = useCallback(
    (id) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      setTimeout(() => removeToast(id), FADE_DURATION);
    },
    [removeToast]
  );

  const toast = useCallback(
    (props = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = props.duration ?? (props.variant === "destructive" ? DESTRUCTIVE_DURATION : TOAST_DURATION);
      const t = {
        id,
        title: props.title,
        description: props.description,
        variant: props.variant === "destructive" ? "destructive" : "default",
        closing: false,
      };
      setToasts((prev) => [t, ...prev].slice(0, TOAST_LIMIT));
      // Auto-dismiss independiente por toast (4s por defecto)
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return { id, dismiss: () => dismiss(id) };
    },
    [dismiss]
  );

  // Registra el push para que el `toast` standalone llegue al provider
  useEffect(() => {
    _push = toast;
    return () => { _push = null; };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[100] flex max-h-screen flex-col-reverse gap-2 p-4 sm:top-auto sm:inset-x-auto sm:bottom-0 sm:right-0 sm:max-w-[420px] sm:flex-col pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full items-start justify-between gap-3 rounded-lg border p-4 pr-3 shadow-lg transition-all duration-300",
              t.closing ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0",
              t.variant === "destructive"
                ? "border-red-500 bg-red-600 text-white"
                : "border-border bg-background text-foreground"
            )}
          >
            <div className="grid min-w-0 gap-1">
              {t.title && <div className="text-sm font-semibold leading-tight">{t.title}</div>}
              {t.description && <div className="text-sm opacity-90 leading-snug">{t.description}</div>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 self-start rounded-md p-1.5 opacity-100 transition-colors hover:bg-black/10 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Si no hay provider, usa el toast standalone (no-op seguro si el provider no montó)
  if (!ctx) return { toast, dismiss: () => {}, toasts: [] };
  return ctx;
}

// Toast standalone: delega al provider si está montado (compatibilidad hacia atrás)
export function toast(props = {}) {
  if (_push) return _push(props);
  return { id: "", dismiss: () => {} };
}