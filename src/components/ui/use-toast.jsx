// Sistema de toasts unificado: re-exporta desde el ToastContext personalizado.
// Este archivo se mantiene solo como puente de compatibilidad para los componentes
// que aún importan useToast/toast desde "@/components/ui/use-toast".
export { ToastProvider, useToast, toast } from "@/context/ToastContext";