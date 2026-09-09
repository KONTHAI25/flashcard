"use client";

import { CEFR_LEVELS, type CEFRLevel, type CardSource } from "@/lib/types";

const LEVEL_STYLES: Record<CEFRLevel, string> = {
  A1: "border-slate-200 bg-slate-50 text-slate-700",
  A2: "border-teal-200 bg-teal-50 text-teal-800",
  B1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  B2: "border-blue-200 bg-blue-50 text-blue-800",
  C1: "border-violet-200 bg-violet-50 text-violet-800",
  C2: "border-amber-200 bg-amber-50 text-amber-800",
};

const SOURCE_STYLES: Record<CardSource, string> = {
  longdo: "border-sky-200 bg-sky-50 text-sky-800",
  oxford: "border-indigo-200 bg-indigo-50 text-indigo-800",
  manual: "border-slate-200 bg-slate-100 text-slate-600",
};

const SOURCE_LABELS: Record<CardSource, string> = {
  longdo: "Longdo",
  oxford: "Oxford",
  manual: "Manual",
};

function badgeBase(extra: string): string {
  return `inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${extra}`;
}

export function LevelBadge({ level }: { level?: CEFRLevel | null }) {
  if (!level) return null;
  return (
    <span className={badgeBase(LEVEL_STYLES[level])} aria-label={`Level ${level}`} title={`CEFR level ${level}`}>
      {level}
    </span>
  );
}

export function SourceTag({ source }: { source?: CardSource | null }) {
  if (!source) return null;
  return (
    <span className={badgeBase(SOURCE_STYLES[source])} title={source === "longdo" ? "Translated with Longdo dictionary" : source === "oxford" ? "From the Oxford seed set" : "Added by hand"}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function PairBadges({ level, source }: { level?: CEFRLevel | null; source?: CardSource | null }) {
  if (!level && !source) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <LevelBadge level={level} />
      <SourceTag source={source} />
    </span>
  );
}

export type CefrFilterValue = "All" | CEFRLevel;

export const CEFR_FILTER_OPTIONS: readonly CefrFilterValue[] = ["All", ...CEFR_LEVELS];

export function CefrFilter({
  value,
  onChange,
  counts,
  idPrefix = "cefr",
}: {
  value: CefrFilterValue;
  onChange: (next: CefrFilterValue) => void;
  counts?: Partial<Record<CefrFilterValue, number>>;
  idPrefix?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by CEFR level">
      {CEFR_FILTER_OPTIONS.map((option) => {
        const active = value === option;
        const count = counts?.[option];
        return (
          <button
            key={option}
            id={`${idPrefix}-${option.toLowerCase()}`}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 ${
              active
                ? "border-[#4255FF] bg-[#4255FF] text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-600 hover:border-[#4255FF] hover:text-slate-900"
            }`}
          >
            {option === "All" ? "All levels" : option}
            {typeof count === "number" && (
              <span aria-hidden="true" className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
