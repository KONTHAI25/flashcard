"use client";

import { useEffect, useRef } from "react";
import { normalizeCard, getDisplayBack, isBilingualCard, type Card } from "@/lib/types";
import { PairBadges } from "@/components/PairMeta";

export function StudyPrompt({ card, revealed, onReveal, onReview }: {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  onReview: (quality: number) => void;
}) {
  const prompt = useRef<HTMLButtonElement>(null);
  useEffect(() => { prompt.current?.focus(); }, []);
  const normalized = normalizeCard(card);
  const answer = getDisplayBack(normalized);
  const bilingual = isBilingualCard(card);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <button
        ref={prompt}
        type="button"
        aria-expanded={revealed}
        aria-controls="study-answer"
        onClick={onReveal}
        onKeyDown={event => {
          if (event.repeat && (event.key === " " || event.key === "Enter")) event.preventDefault();
          if (!revealed || event.repeat || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
          const quality = event.key === "1" || event.key === "ArrowLeft" ? 0
            : event.key === "2" || event.key === "ArrowRight" ? 1 : null;
          if (quality !== null) {
            event.preventDefault();
            onReview(quality);
          }
        }}
        className="block min-h-[240px] w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 sm:p-8"
      >
        <span className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            {bilingual ? "English → Thai" : "Question"}
          </span>
          <PairBadges level={normalized.level} source={normalized.source} />
        </span>
        <span className="block break-words text-2xl font-semibold text-slate-900">{normalized.front}</span>
        <span className="mt-4 block text-xs font-normal text-slate-500">{revealed ? "Choose Still learning or Know" : "Reveal answer · Space or Enter"}</span>
      </button>
      <div id="study-answer" aria-live="polite">
        {revealed && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center sm:p-8">
            <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-indigo-400 uppercase">
              {bilingual ? "Thai · คำแปล" : "Answer"}
            </p>
            <p className="break-words text-2xl font-semibold text-indigo-900">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
