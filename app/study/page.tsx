"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Deck } from "@/lib/types";
import { getDecks, getCardsByDeck } from "@/lib/store";
import { isDue } from "@/lib/srs";
import { Button } from "@/components/Button";

function CheckCircleIcon({ className = "h-8 w-8" }: { className?: string }) {
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
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDecks(getDecks());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading study decks">
        <div className="mb-2 h-8 w-28 animate-pulse rounded-lg bg-slate-200" />
        <div className="mb-6 h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="h-11 w-11 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Study
      </h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        {totalDue === 0
          ? "Nothing due right now"
          : `${totalDue} ${totalDue === 1 ? "term" : "terms"} due across ${decksWithDue.length} ${decksWithDue.length === 1 ? "set" : "sets"}`}
      </p>

      {totalDue === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div
            className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-500"
            aria-hidden="true"
          >
            <CheckCircleIcon />
          </div>
          <p className="mt-4 font-semibold tracking-tight text-slate-900">
            All caught up
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            No terms due for review. Come back later or add new terms.
          </p>
          <Button onClick={() => router.push("/")} className="mt-5">
            Browse sets
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {decksWithDue.map(({ deck, total, dueCount }) => (
            <button
              key={deck.id}
              type="button"
              onClick={() => router.push(`/study/${deck.id}`)}
              aria-label={`Study ${deck.name}, ${dueCount} due`}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xl"
                aria-hidden="true"
              >
                {deck.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">
                  {deck.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {total} {total === 1 ? "term" : "terms"} total
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                {dueCount} due
              </span>
              <span className="shrink-0 text-slate-400" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
