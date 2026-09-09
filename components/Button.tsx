"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./ui";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "grade";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[#4255FF] text-white shadow-sm hover:bg-[#3040E6] active:bg-[#3040E6]",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100",
  danger:
    "border border-transparent bg-red-500 text-white shadow-sm hover:bg-red-600 active:bg-red-700",
  success:
    "border border-transparent bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:bg-emerald-700",
  ghost:
    "border border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[40px] rounded-lg px-3 py-1.5 text-sm",
  md: "min-h-[44px] rounded-lg px-4 py-2.5 text-sm",
  lg: "min-h-[48px] rounded-lg px-6 py-3 text-base",
  grade: "min-h-[68px] rounded-2xl px-6 py-4 text-base",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
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
