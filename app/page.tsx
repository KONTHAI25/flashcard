"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, createDeck, deleteDeck, getCardsByDeck } from "@/lib/store";
import { isDue } from "@/lib/srs";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";

const EMOJIS = ["🎯", "📖", "🧮", "🌍", "💻", "🎨", "🔬", "🎵", "🧠", "⚡"];

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

function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-slate-600"
    >
      <path
        d="M6.75 4.5 11.25 9l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
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
      className="text-slate-500"
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

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");

  useEffect(() => {
    setDecks(getDecks());
  }, []);

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
    if (!window.confirm(`Delete "${deckName}" and all its cards?`)) return;
    deleteDeck(id);
    setDecks(getDecks());
  }

  const canCreate = name.trim().length > 0;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Decks
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} size="sm">
          <PlusIcon />
          New Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800"
            aria-hidden="true"
          >
            <EmptyStateIcon />
          </div>
          <p className="mt-4 font-semibold tracking-tight text-slate-200">
            No decks yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Create a deck to start studying
          </p>
          <Button onClick={() => setSheetOpen(true)} size="sm" className="mt-5">
            <PlusIcon />
            Create deck
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => {
            const stat = stats.get(deck.id) ?? { total: 0, due: 0 };
            return (
              <li key={deck.id}>
                <div className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/80 p-3 pl-3 pr-2 transition-colors hover:border-indigo-500/40 hover:bg-slate-900">
                  <Link
                    href={`/deck/${deck.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    aria-label={`Open ${deck.name}`}
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-xl"
                    >
                      {deck.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold tracking-tight text-slate-100">
                        {deck.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {stat.total} {stat.total === 1 ? "card" : "cards"} ·{" "}
                        {stat.due} due
                      </span>
                    </span>
                    <span className="grid w-6 shrink-0 place-items-center" aria-hidden="true">
                      <ChevronRightIcon />
                    </span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, deck.id, deck.name)}
                      aria-label={`Delete ${deck.name}`}
                      className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New Deck">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div>
            <label
              htmlFor="deck-name"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Name
            </label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spanish Vocab"
              autoComplete="off"
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Give your deck a short, memorable name.
            </p>
          </div>
          <div>
            <p
              id="deck-emoji-label"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Icon
            </p>
            <div
              role="group"
              aria-labelledby="deck-emoji-label"
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
                    aria-label={`Use ${e} as deck icon`}
                    className={`grid h-11 w-11 place-items-center rounded-xl text-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                      selected
                        ? "bg-slate-700 ring-2 ring-indigo-500"
                        : "bg-slate-800 ring-1 ring-transparent hover:bg-slate-700"
                    }`}
                  >
                    <span aria-hidden="true">{e}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Pick an icon to recognise your deck at a glance.
            </p>
          </div>
          <Button type="submit" disabled={!canCreate} className="w-full">
            Create Deck
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
