"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, createDeck, deleteDeck } from "@/lib/store";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";

const EMOJIS = ["🎯", "📖", "🧮", "🌍", "💻", "🎨", "🔬", "🎵", "🧠", "⚡"];

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  function handleCreate() {
    if (!name.trim()) return;
    createDeck(name.trim(), emoji);
    setDecks(getDecks());
    setName("");
    setEmoji("🎯");
    setSheetOpen(false);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    deleteDeck(id);
    setDecks(getDecks());
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 My Decks</h1>
        <Button onClick={() => setSheetOpen(true)} size="sm">
          + New
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p className="text-4xl mb-3">🃏</p>
          <p>No decks yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/deck/${deck.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-600"
            >
              <span className="text-2xl">{deck.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold">{deck.name}</p>
                <p className="text-xs text-slate-500">
                  Created {new Date(deck.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(deck.id);
                }}
                className="rounded-lg p-2 text-slate-600 hover:bg-red-900/30 hover:text-red-400"
                aria-label="Delete deck"
              >
                🗑
              </button>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New Deck">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spanish Vocab"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-xl rounded-lg p-2 transition-colors ${
                    emoji === e ? "bg-blue-600" : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} className="w-full">
            Create Deck
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
