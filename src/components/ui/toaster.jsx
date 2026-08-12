import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex max-h-screen flex-col-reverse gap-2 p-4 sm:top-auto sm:inset-x-auto sm:bottom-0 sm:right-0 sm:max-w-[420px] sm:flex-col overflow-hidden">
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
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
            className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}