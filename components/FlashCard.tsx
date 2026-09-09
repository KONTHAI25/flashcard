"use client";

import { useState, useEffect } from "react";
import { parseLegacyBack, type CEFRLevel, type CardSource } from "@/lib/types";
import { PairBadges } from "@/components/PairMeta";

interface FlashCardProps {
  front: string;
  back: string;
  level?: CEFRLevel;
  source?: CardSource;
  bilingual?: boolean;
}

export function FlashCard({ front, back, level, source, bilingual = false }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  // back may still carry a legacy " [B1]" suffix from old seeds — strip it
  // for display and fall back to it when no structured level exists.
  const { text: cleanBack, level: legacyLevel } = parseLegacyBack(back);
  const effectiveLevel = level ?? legacyLevel;

  // Reset flip state when moving to a different card (belt-and-suspenders
  // alongside key={card.id} remounting in the study session page).
  useEffect(() => {
    setFlipped(false);
  }, [front, back]);

  const toggle = () => setFlipped((f) => !f);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={`${flipped ? "Back" : "Front"}: ${flipped ? cleanBack : front}. ${flipped ? "Show front" : "Reveal answer"}`}
        onClick={toggle}
        className="card-flip mx-auto block w-full max-w-2xl cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-0 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
      >
        <span
          className={`card-flip-inner grid min-h-[240px] w-full motion-reduce:transition-none ${flipped ? "flipped" : ""}`}
        >
          {/* Front — English */}
          <span aria-hidden={flipped} className="card-flip-front flex min-h-[240px] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                {bilingual ? "English" : "Front"}
              </span>
              <PairBadges level={effectiveLevel} source={source} />
            </span>
            <span className="grid flex-1 place-items-center py-6">
              <span className="min-w-0 w-full whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-center text-2xl leading-relaxed font-semibold text-slate-900">
                {front}
              </span>
            </span>
            <span className="text-center text-xs text-slate-400">
              {bilingual ? "Thai meaning on the back" : "Answer on the back"}
            </span>
          </span>
          {/* Back — Thai */}
          <span aria-hidden={!flipped} className="card-flip-back flex min-h-[240px] flex-col rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-md sm:p-8">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-[0.14em] text-indigo-400 uppercase">
                {bilingual ? "Thai · คำแปล" : "Back"}
              </span>
              <PairBadges level={effectiveLevel} source={source} />
            </span>
            <span className="grid flex-1 place-items-center py-6">
              <span className="min-w-0 w-full whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-center text-2xl leading-relaxed font-semibold text-indigo-900">
                {cleanBack}
              </span>
            </span>
            <span className="text-center text-xs text-indigo-400">
              {front}
            </span>
          </span>
        </span>
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">
        {flipped ? "Tap to see front" : "Tap to reveal answer"} · press{" "}
        <kbd className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
          Space
        </kbd>
      </p>
      <style jsx>{`
        .card-flip-front, .card-flip-back {
          grid-area: 1 / 1;
          min-width: 0;
          position: relative;
          inset: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-flip-inner, .card-flip-inner.flipped, .card-flip-back {
            transform: none;
            transition: none;
          }
          [aria-hidden="true"] { visibility: hidden; }
        }
      `}</style>
    </div>
  );
}
