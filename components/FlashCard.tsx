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
        aria-label={flipped ? "Tap to see front" : "Tap to reveal answer"}
        onClick={toggle}
        className="card-flip mx-auto block w-full max-w-2xl cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-0 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
      >
        <span
          className={`card-flip-inner block min-h-[240px] w-full motion-reduce:transform-none motion-reduce:transition-none ${flipped ? "flipped" : ""}`}
        >
          {/* Front */}
          <span className="card-flip-front grid min-h-[240px] place-items-center rounded-xl border border-slate-200 bg-white p-8 shadow-md">
            <p className="max-h-[240px] w-full overflow-y-auto break-words text-center text-2xl leading-relaxed font-semibold text-slate-900">
              {front}
            </p>
          </span>
          {/* Back */}
          <span className="card-flip-back grid min-h-[240px] place-items-center rounded-xl border border-indigo-200 bg-indigo-50 p-8 shadow-md">
            <p className="max-h-[240px] w-full overflow-y-auto break-words text-center text-2xl leading-relaxed font-semibold text-indigo-900">
              {back}
            </p>
          </span>
        </span>
      </button>
      {flipped ? (
        <span aria-live="polite" className="sr-only">
          {back}
        </span>
      ) : null}
      <p className="mt-3 text-center text-xs text-slate-500">
        {flipped ? "Tap to see front" : "Tap to reveal answer"} · press{" "}
        <kbd className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
          Space
        </kbd>
      </p>
    </div>
  );
}
