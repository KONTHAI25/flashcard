"use client";

import { useState } from "react";

interface FlashCardProps {
  front: string;
  back: string;
}

export function FlashCard({ front, back }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="card-flip w-full text-left"
      aria-label={flipped ? "Tap to see front" : "Tap to reveal answer"}
    >
      <div className={`card-flip-inner min-h-[260px] w-full ${flipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className="card-flip-front flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-lg">
          <p className="text-center text-xl leading-relaxed font-medium">
            {front}
          </p>
        </div>
        {/* Back */}
        <div className="card-flip-back flex items-center justify-center rounded-2xl border border-blue-700 bg-blue-900/40 p-8 shadow-lg">
          <p className="text-center text-xl leading-relaxed font-medium text-blue-200">
            {back}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {flipped ? "Tap to see front" : "Tap to reveal answer"}
      </p>
    </button>
  );
}
