"use client";

import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- EmptyState ---------- */

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

function DefaultEmptyIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function EmptyState({ title, hint, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <DefaultEmptyIcon />}
      </div>
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      {hint && (
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">{hint}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */

type BadgeVariant = "due" | "dim" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  due: "border-indigo-200 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  dim: "border-slate-200 bg-slate-100 text-slate-500",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export function Badge({ variant = "dim", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- ProgressBar ---------- */

interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-[#4255FF] transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
