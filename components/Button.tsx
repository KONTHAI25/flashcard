"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-indigo-600 text-white shadow-sm shadow-indigo-950/40 hover:bg-indigo-500 active:bg-indigo-700",
  secondary:
    "border border-slate-700 bg-slate-800 text-slate-100 shadow-sm hover:bg-slate-700 active:bg-slate-800",
  danger:
    "border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700",
  ghost:
    "border border-transparent bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[40px] rounded-lg px-3 py-1.5 text-sm",
  md: "min-h-[44px] rounded-xl px-4 py-2.5 text-sm",
  lg: "min-h-[48px] rounded-xl px-6 py-3 text-base",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-w-[44px] cursor-pointer items-center justify-center gap-2 font-semibold",
        "transition-all duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-none",
        "disabled:active:scale-100",
        variants[variant],
        sizes[size],
        loading && "cursor-wait",
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
