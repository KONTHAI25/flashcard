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
  pending?: boolean;
  error?: string;
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

async function undoToast(toast: ToastData) {
  if (current?.key !== toast.key || current.pending || !toast.onUndo) return;
  if (timer) { clearTimeout(timer); timer = null; }
  current = { ...toast, pending: true, error: undefined };
  emit(current);
  try {
    await toast.onUndo();
    // An undo callback may publish a new toast of its own.
    if (current?.key === toast.key) dismissToast();
  } catch {
    if (current?.key !== toast.key) return;
    current = { ...toast, pending: false, error: "Could not undo. Please try again." };
    emit(current);
  }
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
    <div className="fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
      >
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <p className="text-sm text-slate-900">{toast.message}</p>
          {toast.error && <p role="alert" className="text-sm text-red-700">{toast.error}</p>}
        </div>
        {showUndo && (
          <button
            type="button"
            disabled={toast.pending}
            onClick={() => { void undoToast(toast); }}
            className="cursor-pointer text-sm font-semibold text-[#4255FF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {toast.pending ? "Undoing..." : toast.label}
          </button>
        )}
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss"
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
