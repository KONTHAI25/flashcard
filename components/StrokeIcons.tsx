import type { ReactNode } from "react";

/* Inline stroke SVGs shared by study, quiz and deck pages (decorative only). */
function StrokeIcon({ className, strokeWidth = 2, children }: { className: string; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </StrokeIcon>
  );
}

export function CheckCircleIcon({ className = "h-5 w-5", strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <StrokeIcon className={className} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </StrokeIcon>
  );
}
