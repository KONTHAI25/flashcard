"use client";

import { useEffect, useState, type ReactElement } from "react";

interface ToastOptions {
  label?: string;
  onUndo?: () => void;
}

interface ToastData {
  message: string;
  label?: string;
  onUndo?: () => void;
  key: number;
}

type Listener = (toast: ToastData | null) => void;

const listeners = new Set<Listener>();
let current: ToastData | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

function emit(toast: ToastData | null) {
  listeners.forEach((l) => l(toast));
}

function dismissToast() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  current = null;
  emit(null);
}

export function showToast(message: string, opts?: ToastOptions): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  current = { message, label: opts?.label, onUndo: opts?.onUndo, key: ++seq };
  emit(current);
  timer = setTimeout(() => {
    current = null;
    timer = null;
    emit(null);
  }, 5000);
}

export function ToastHost(): ReactElement {
  const [toast, setToast] = useState<ToastData | null>(current);

  useEffect(() => {
    const listener: Listener = (t) => setToast(t ? { ...t } : null);
    listeners.add(listener);
    if (current) setToast({ ...current });
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!toast) return <></>;

  const showUndo = Boolean(toast.label && toast.onUndo);

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
      >
        <p className="text-sm text-slate-900">{toast.message}</p>
        {showUndo && (
          <button
            type="button"
            onClick={() => {
              toast.onUndo?.();
              dismissToast();
            }}
            className="cursor-pointer text-sm font-semibold text-[#4255FF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {toast.label}
          </button>
        )}
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss"
          className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
