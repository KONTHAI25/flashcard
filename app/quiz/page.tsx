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
      <h1 className="text-2xl font-bold text-slate-900">Test</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Pick a set — at least 4 terms
      </p>

      {decks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="mb-1 text-base font-semibold text-slate-900">
            No sets yet
          </p>
          <p className="text-sm text-slate-500">
            Create a set to start testing yourself.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => {
            const count = getCardsByDeck(deck.id).length;
            const ready = count >= MIN_CARDS;
            const rowClass =
              "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors";
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl"
                >
                  {deck.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {deck.name}
                  </p>
                  <p className="text-xs text-slate-500">{count} terms</p>
                </div>
                {ready ? (
                  <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    Ready
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
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
                    className={`${rowClass} hover:border-[#4255FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
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
                  title={`Add ${MIN_CARDS - count} more terms to start a test`}
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
