"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";
import { Badge } from "@/components/ui";

const MIN_CARDS = 4;

function ChevronRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function QuizIndexPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quiz</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Pick a set — at least 4 terms
      </p>

      {decks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="mb-1 text-base font-semibold text-slate-900">
            No sets yet
          </p>
          <p className="text-sm text-slate-500">
            Create a set to start a quiz.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => {
            const count = getCardsByDeck(deck.id).length;
            const ready = count >= MIN_CARDS;
            const rowClass =
              "flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2";
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xl"
                >
                  {deck.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">
                    {deck.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {count} {count === 1 ? "term" : "terms"} total
                  </span>
                </span>
                {ready ? (
                  <Badge variant="due" className="shrink-0">
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="dim" className="shrink-0">
                    Need {MIN_CARDS - count} more
                  </Badge>
                )}
                <span className="shrink-0 text-slate-400" aria-hidden="true">
                  <ChevronRightIcon />
                </span>
              </>
            );

            if (ready) {
              return (
                <li key={deck.id}>
                  <Link
                    href={`/quiz/${deck.id}`}
                    aria-label={`Quiz on ${deck.name}, ${count} terms`}
                    className={`${rowClass} hover:border-slate-300 hover:shadow-md active:scale-[0.99]`}
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
                  title={`Add ${MIN_CARDS - count} more terms to start a quiz`}
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
