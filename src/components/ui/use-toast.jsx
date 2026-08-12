import { useState, useEffect, useCallback } from "react";

const TOAST_LIMIT = 5;
const TOAST_DURATION = 4000;
const FADE_DURATION = 300;

let memoryState = { toasts: [] };
const listeners = new Set();

function notify() {
  listeners.forEach((l) => l(memoryState));
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function removeToast(id) {
  memoryState = { toasts: memoryState.toasts.filter((t) => t.id !== id) };
  notify();
}

// Marca el toast en cierre (fade-out) y lo remueve tras FADE_DURATION
function dismissToast(id) {
  memoryState = {
    toasts: memoryState.toasts.map((t) => (t.id === id ? { ...t, closing: true } : t)),
  };
  notify();
  setTimeout(() => removeToast(id), FADE_DURATION);
}

function toast(props = {}) {
  const id = props.id || genId();
  const duration = props.duration ?? TOAST_DURATION;

  const t = {
    id,
    title: props.title,
    description: props.description,
    variant: props.variant === "destructive" ? "destructive" : "default",
    closing: false,
  };

  memoryState = { toasts: [t, ...memoryState.toasts].slice(0, TOAST_LIMIT) };
  notify();

  // Auto-dismiss independiente por toast
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return {
    id,
    dismiss: () => dismissToast(id),
    update: (newProps) => {
      memoryState = {
        toasts: memoryState.toasts.map((x) => (x.id === id ? { ...x, ...newProps } : x)),
      };
      notify();
    },
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  const dismiss = useCallback((id) => dismissToast(id), []);

  return { ...state, toast, dismiss };
}

export { useToast, toast };