"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";

const MIN_CARDS = 4;

export default function QuizIndexPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Quiz</h1>
      <p className="mb-6 mt-1 text-sm text-slate-400">
        Test yourself with multiple-choice questions. Decks need at least {MIN_CARDS} cards to start a quiz.
      </p>

      {decks.length === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p className="mb-2 text-3xl">No decks yet</p>
          <p className="text-sm">Create a deck to start quizzing yourself.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => {
            const count = getCardsByDeck(deck.id).length;
            const ready = count >= MIN_CARDS;
            const rowClass =
              "flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors";
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-xl"
                >
                  {deck.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{deck.name}</p>
                  <p className="text-xs text-slate-500">{count} cards</p>
                </div>
                {ready ? (
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    Ready
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
                    Need {MIN_CARDS - count} more
                  </span>
                )}
              </>
            );

            if (ready) {
              return (
                <li key={deck.id}>
                  <Link
                    href={`/quiz/${deck.id}`}
                    className={`${rowClass} hover:border-indigo-500/50 hover:bg-slate-800/80`}
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={deck.id}>
                <div
                  aria-disabled="true"
                  title={`Add ${MIN_CARDS - count} more cards to start a quiz`}
                  className={`${rowClass} cursor-not-allowed opacity-60`}
                >
                  {content}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
