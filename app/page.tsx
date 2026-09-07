"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Deck } from "@/lib/types";
import { getDecks, createDeck, deleteDeck, restoreDeck, getCardsByDeck } from "@/lib/store";
import { isDue } from "@/lib/srs";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { Badge } from "@/components/ui";

const EMOJIS = ["🎯", "📖", "🧮", "🌍", "💻", "🎨", "🔬", "🎵", "🧠", "⚡"];

const PRIMARY = "#4255FF";

type Filter = "all" | "due" | "not-started";
type Sort = "due" | "az" | "recent";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "not-started", label: "Not started" },
];

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    >
      <path
        d="M12.5 12.5 16 16M14.25 8.125a6.125 6.125 0 1 1-12.25 0 6.125 6.125 0 0 1 12.25 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5h12M7.5 4.5V3.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V4.5M5.25 4.5l.6 8.63a1.5 1.5 0 0 0 1.5 1.37h3.3a1.5 1.5 0 0 0 1.5-1.37l.6-8.63"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 8.25v3.75M10.5 8.25v3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyStateIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-slate-400"
    >
      <path
        d="m12 3 9 5-9 5-9-5 9-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m3 12.5 9 5 9-5M3 17l9 5 9-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DecksPageInner() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("due");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setSheetOpen(true);
      router.replace("/");
    }
  }, [searchParams, router]);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; due: number }>();
    for (const deck of decks) {
      const cards = getCardsByDeck(deck.id);
      map.set(deck.id, {
        total: cards.length,
        due: cards.filter(isDue).length,
      });
    }
    return map;
  }, [decks]);

  const totalDue = useMemo(() => {
    let sum = 0;
    for (const stat of stats.values()) sum += stat.due;
    return sum;
  }, [stats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? decks.filter((deck) => deck.name.toLowerCase().includes(q))
      : [...decks];
    if (filter === "due") {
      list = list.filter((deck) => (stats.get(deck.id)?.due ?? 0) > 0);
    } else if (filter === "not-started") {
      list = list.filter((deck) => (stats.get(deck.id)?.total ?? 0) === 0);
    }
    const sorted = [...list];
    if (sort === "due") {
      sorted.sort(
        (a, b) => (stats.get(b.id)?.due ?? 0) - (stats.get(a.id)?.due ?? 0)
      );
    } else if (sort === "az") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    return sorted;
  }, [decks, query, filter, sort, stats]);

  function handleCreate() {
    if (!name.trim()) return;
    createDeck(name.trim(), emoji);
    setDecks(getDecks());
    setName("");
    setEmoji("🎯");
    setSheetOpen(false);
  }

  function handleDelete(
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    deckName: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    const removed = deleteDeck(id);
    setDecks(getDecks());
    showToast(`Deleted "${deckName}"`, {
      label: "Undo",
      onUndo: () => {
        if (removed.deck) restoreDeck(removed.deck, removed.cards);
        setDecks(getDecks());
      },
    });
  }

  function handleClearFilters() {
    setQuery("");
    setFilter("all");
  }

  const canCreate = name.trim().length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {decks.length} {decks.length === 1 ? "set" : "sets"} · {totalDue}{" "}
            {totalDue === 1 ? "term" : "terms"} due
          </p>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          style={{ backgroundColor: PRIMARY }}
          className="shrink-0"
        >
          <PlusIcon />
          Create set
        </Button>
      </div>

      {totalDue > 0 && (
        <div className="mb-4">
          <Link
            href="/study/all"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#4255FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3040E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Study all due ({totalDue})
          </Link>
        </div>
      )}

      <div className="relative mb-4">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sets"
          aria-label="Search sets"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sets">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  active
                    ? "border-transparent bg-indigo-50 text-[#4255FF]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <span className="sr-only">Sort sets</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort sets"
            className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
          >
            <option value="due">Most due</option>
            <option value="az">A–Z</option>
            <option value="recent">Recently created</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        decks.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div
              className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50"
              aria-hidden="true"
            >
              <EmptyStateIcon />
            </div>
            <p className="mt-4 font-semibold tracking-tight text-slate-900">
              No sets yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create a set to start studying
            </p>
            <Button
              onClick={() => setSheetOpen(true)}
              size="sm"
              style={{ backgroundColor: PRIMARY }}
              className="mt-5"
            >
              <PlusIcon />
              Create set
            </Button>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div
              className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50"
              aria-hidden="true"
            >
              <EmptyStateIcon />
            </div>
            <p className="mt-4 font-semibold tracking-tight text-slate-900">
              {hasQuery ? (
                <>No results for &ldquo;{query.trim()}&rdquo;</>
              ) : (
                <>No sets match this filter</>
              )}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search term.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {hasQuery && filter !== "all"
                ? "Clear search and filters"
                : hasQuery
                  ? "Clear search"
                  : "Clear filter"}
            </button>
          </div>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deck) => {
            const stat = stats.get(deck.id) ?? { total: 0, due: 0 };
            return (
              <li key={deck.id}>
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <Link
                    href={`/deck/${deck.id}`}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    aria-label={`Open ${deck.name}`}
                  >
                    <span className="flex items-center gap-3">
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
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {stat.total} {stat.total === 1 ? "term" : "terms"} ·{" "}
                          {stat.due} due
                        </span>
                      </span>
                    </span>
                    {stat.due > 0 && (
                      <Badge variant="warning" className="mt-3">
                        {stat.due} due
                      </Badge>
                    )}
                  </Link>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <Link
                      href={`/deck/${deck.id}`}
                      className="rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      style={{ color: PRIMARY }}
                      aria-label={`Study ${deck.name}`}
                    >
                      Study &rarr;
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, deck.id, deck.name)}
                      aria-label={`Delete ${deck.name}`}
                      className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New set">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div>
            <label
              htmlFor="set-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="set-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spanish Vocab"
              autoComplete="off"
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Give your set a short, memorable name.
            </p>
          </div>
          <div>
            <p
              id="set-emoji-label"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Icon
            </p>
            <div
              role="group"
              aria-labelledby="set-emoji-label"
              className="flex flex-wrap gap-2"
            >
              {EMOJIS.map((e) => {
                const selected = emoji === e;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={selected}
                    aria-label={`Use ${e} as set icon`}
                    className={`grid h-11 w-11 place-items-center rounded-xl border text-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                      selected
                        ? "border-transparent bg-indigo-50 ring-2 ring-indigo-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span aria-hidden="true">{e}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Pick an icon to recognise your set at a glance.
            </p>
          </div>
          <Button
            type="submit"
            disabled={!canCreate}
            style={{ backgroundColor: PRIMARY }}
            className="w-full"
          >
            Create set
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

export default function DecksPage() {
  return (
    <Suspense fallback={null}>
      <DecksPageInner />
    </Suspense>
  );
}
