"use client";

import { useState, useEffect } from "react";

interface FlashCardProps {
  front: string;
  back: string;
}

export function FlashCard({ front, back }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

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
        aria-label={`${flipped ? "Back" : "Front"}: ${flipped ? back : front}. ${flipped ? "Show front" : "Reveal answer"}`}
        onClick={toggle}
        className="card-flip mx-auto block w-full max-w-2xl cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-0 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
      >
        <span
          className={`card-flip-inner grid min-h-[240px] w-full motion-reduce:transition-none ${flipped ? "flipped" : ""}`}
        >
          {/* Front */}
          <span aria-hidden={flipped} className="card-flip-front grid min-h-[240px] place-items-center rounded-xl border border-slate-200 bg-white p-8 shadow-md">
            <span className="min-w-0 w-full whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-center text-2xl leading-relaxed font-semibold text-slate-900">
              {front}
            </span>
          </span>
          {/* Back */}
          <span aria-hidden={!flipped} className="card-flip-back grid min-h-[240px] place-items-center rounded-xl border border-indigo-200 bg-indigo-50 p-8 shadow-md">
            <span className="min-w-0 w-full whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-center text-2xl leading-relaxed font-semibold text-indigo-900">
              {back}
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
