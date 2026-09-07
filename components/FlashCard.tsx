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
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? "Tap to see front" : "Tap to reveal answer"}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="card-flip w-full cursor-pointer rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
      >
        <div
          className={`card-flip-inner min-h-[280px] w-full motion-reduce:transform-none motion-reduce:transition-none ${flipped ? "flipped" : ""}`}
        >
          {/* Front */}
          <div className="card-flip-front grid min-h-[280px] place-items-center rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl shadow-black/30">
            <p className="max-h-[240px] w-full overflow-y-auto break-words text-center text-xl leading-relaxed font-medium text-slate-100">
              {front}
            </p>
          </div>
          {/* Back */}
          <div className="card-flip-back grid min-h-[280px] place-items-center rounded-2xl border border-indigo-500/40 bg-indigo-950/60 p-8 shadow-xl shadow-indigo-950/30">
            <p className="max-h-[240px] w-full overflow-y-auto break-words text-center text-xl leading-relaxed font-medium text-indigo-100">
              {back}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {flipped ? "Tap to see front" : "Tap to reveal answer"} · press{" "}
        <kbd className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
          Space
        </kbd>
      </p>
    </div>
  );
}
