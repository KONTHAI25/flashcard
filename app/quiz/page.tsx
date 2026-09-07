"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";

export default function QuizIndexPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">❓ Quiz</h1>
      <p className="mb-4 text-sm text-slate-400">Select a deck to start a multiple-choice quiz (min. 4 cards).</p>

      {decks.length === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p className="text-3xl mb-2">📝</p>
          <p>No decks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => {
            const count = getCardsByDeck(deck.id).length;
            return (
              <Link
                key={deck.id}
                href={`/quiz/${deck.id}`}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                  count >= 4
                    ? "border-slate-800 bg-slate-900 hover:border-blue-600"
                    : "border-slate-800 bg-slate-900/50 opacity-50 pointer-events-none"
                }`}
              >
                <span className="text-2xl">{deck.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold">{deck.name}</p>
                  <p className="text-xs text-slate-500">{count} cards</p>
                </div>
                {count < 4 && (
                  <span className="text-xs text-slate-500">need {4 - count} more</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
