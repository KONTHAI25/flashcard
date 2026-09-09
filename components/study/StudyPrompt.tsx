"use client";

import { useEffect, useRef } from "react";
import type { Card } from "@/lib/types";

export function StudyPrompt({ card, revealed, onReveal, onReview }: {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  onReview: (quality: number) => void;
}) {
  const prompt = useRef<HTMLButtonElement>(null);
  useEffect(() => { prompt.current?.focus(); }, []);
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
        className="block min-h-[240px] w-full rounded-xl border border-slate-200 bg-white p-8 text-center text-2xl font-semibold text-slate-900 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
      >
        <span className="block break-words">{card.front}</span>
        <span className="mt-4 block text-xs font-normal text-slate-500">{revealed ? "Choose Still learning or Know" : "Reveal answer · Space or Enter"}</span>
      </button>
      <div id="study-answer" aria-live="polite">
        {revealed && <p className="mt-3 break-words rounded-xl border border-indigo-200 bg-indigo-50 p-8 text-center text-2xl font-semibold text-indigo-900">{card.back}</p>}
      </div>
    </div>
  );
}
