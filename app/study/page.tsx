"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";
import { isDue } from "@/lib/srs";

function CheckCircleIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </svg>
  );
}

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

export default function StudyIndexPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDecks(getDecks());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading study decks">
        <div className="mb-2 h-8 w-28 animate-pulse rounded-lg bg-slate-800" />
        <div className="mb-6 h-4 w-48 animate-pulse rounded bg-slate-800/70" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800/70" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const decksWithDue = decks
    .map((d) => {
      const cards = getCardsByDeck(d.id);
      return {
        deck: d,
        total: cards.length,
        dueCount: cards.filter(isDue).length,
      };
    })
    .filter((d) => d.dueCount > 0);

  const totalDue = decksWithDue.reduce((s, d) => s + d.dueCount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Study</h1>
      <p className="mb-6 mt-1 text-sm text-slate-400">
        {totalDue === 0
          ? "Nothing due right now"
          : `${totalDue} card${totalDue !== 1 ? "s" : ""} due across ${decksWithDue.length} deck${decksWithDue.length !== 1 ? "s" : ""}`}
      </p>

      {totalDue === 0 ? (
        <div className="mx-auto mt-16 flex max-w-sm flex-col items-center text-center">
          <span className="mb-4 text-emerald-400">
            <CheckCircleIcon />
          </span>
          <h2 className="text-lg font-semibold">All caught up</h2>
          <p className="mt-1 text-sm text-slate-400">
            No cards due for review. Come back later or add new cards.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600"
          >
            Browse decks
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {decksWithDue.map(({ deck, total, dueCount }) => (
            <Link
              key={deck.id}
              href={`/study/${deck.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900/70"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl"
                aria-hidden="true"
              >
                {deck.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{deck.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {total} card{total !== 1 ? "s" : ""} total
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20">
                {dueCount} due
              </span>
              <span className="shrink-0 text-slate-600" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
