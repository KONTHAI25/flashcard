"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";
import { isDue } from "@/lib/srs";

export default function StudyIndexPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  const decksWithDue = decks
    .map((d) => ({
      deck: d,
      dueCount: getCardsByDeck(d.id).filter(isDue).length,
    }))
    .filter((d) => d.dueCount > 0);

  const totalDue = decksWithDue.reduce((s, d) => s + d.dueCount, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">🧠 Study</h1>

      {totalDue === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p className="text-4xl mb-3">✨</p>
          <p>All caught up! No cards due for review.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-400">{totalDue} card{totalDue !== 1 ? "s" : ""} due across {decksWithDue.length} deck{decksWithDue.length !== 1 ? "s" : ""}</p>
          <div className="space-y-3">
            {decksWithDue.map(({ deck, dueCount }) => (
              <Link
                key={deck.id}
                href={`/study/${deck.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-blue-600"
              >
                <span className="text-2xl">{deck.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold">{deck.name}</p>
                </div>
                <span className="rounded-full bg-amber-900/50 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {dueCount} due
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
