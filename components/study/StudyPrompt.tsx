"use client";

import { useEffect, useRef } from "react";
import { normalizeCard, isBilingualCard, type Card } from "@/lib/types";
import { studyFace } from "@/lib/study-settings";
import { PairBadges } from "@/components/PairMeta";

export function StudyPrompt({ card, revealed, swap = false, onReveal, onReview }: {
  card: Card;
  revealed: boolean;
  swap?: boolean;
  onReveal: () => void;
  onReview: (quality: number) => void;
}) {
  const prompt = useRef<HTMLButtonElement>(null);
  useEffect(() => { prompt.current?.focus(); }, []);
  const normalized = normalizeCard(card);
  const face = studyFace(normalized, swap);
  const answer = face.answer;
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
          <span className="inline-flex min-w-0 items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-indigo-700 uppercase">
            {bilingual ? (
              <>
                {face.promptLabel}
                <span aria-hidden="true" className="px-1 text-indigo-400">→</span>
                {face.answerLabel}
              </>
            ) : "Question"}
          </span>
          <span className="flex min-w-0 flex-wrap justify-end gap-1.5">
            <PairBadges level={normalized.level} source={normalized.source} />
          </span>
        </span>
        <span className="block break-words text-2xl font-semibold text-slate-900">{face.prompt}</span>
        <span className="mt-4 block text-xs font-normal text-slate-500">{revealed ? "Choose Still learning or Know" : "Reveal answer · Space or Enter"}</span>
      </button>
      <div id="study-answer" aria-live="polite">
        {revealed && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center sm:p-8">
            <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-indigo-700 uppercase">
              {bilingual ? `${face.answerLabel}${face.answerLabel === "Thai" ? " · คำแปล" : " · Answer"}` : "Answer"}
            </p>
            <p className="break-words text-2xl font-semibold text-indigo-900">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
