"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deck, Card as CardType } from "@/lib/types";
import { getDeck, getCardsByDeck, createCard, deleteCard, updateCard } from "@/lib/store";
import { isDue, nextReviewLabel } from "@/lib/srs";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editCardId, setEditCardId] = useState<string | null>(null);

  useEffect(() => {
    const d = getDeck(id);
    if (!d) {
      router.push("/");
      return;
    }
    setDeck(d);
    setCards(getCardsByDeck(id));
  }, [id, router]);

  function refresh() {
    setCards(getCardsByDeck(id));
  }

  function handleSaveCard() {
    if (!front.trim() || !back.trim()) return;
    if (editCardId) {
      updateCard(editCardId, { front: front.trim(), back: back.trim() });
    } else {
      createCard(id, front.trim(), back.trim());
    }
    setFront("");
    setBack("");
    setEditCardId(null);
    setSheetOpen(false);
    refresh();
  }

  function handleEditCard(card: CardType) {
    setFront(card.front);
    setBack(card.back);
    setEditCardId(card.id);
    setSheetOpen(true);
  }

  function handleDeleteCard(cardId: string) {
    deleteCard(cardId);
    refresh();
  }

  const dueCount = cards.filter(isDue).length;

  if (!deck) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-slate-400 hover:text-white">
          ←
        </button>
        <span className="text-2xl">{deck.emoji}</span>
        <h1 className="text-xl font-bold">{deck.name}</h1>
      </div>

      {/* Action buttons */}
      <div className="mb-4 flex gap-2">
        <Link href={`/study/${id}`} className="flex-1">
          <Button className="w-full" disabled={dueCount === 0}>
            🧠 Study ({dueCount} due)
          </Button>
        </Link>
        <Link href={`/quiz/${id}`} className="flex-1">
          <Button variant="secondary" className="w-full" disabled={cards.length < 4}>
            ❓ Quiz
          </Button>
        </Link>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-400">{cards.length} cards</p>
        <Button size="sm" onClick={() => { setFront(""); setBack(""); setEditCardId(null); setSheetOpen(true); }}>
          + Add Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="mt-12 text-center text-slate-500">
          <p className="text-3xl mb-2">🃏</p>
          <p>No cards yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{card.front}</p>
                  <p className="truncate text-sm text-slate-400">{card.back}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isDue(card) ? "bg-amber-900/50 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
                    {isDue(card) ? "due" : nextReviewLabel(card)}
                  </span>
                  <button
                    onClick={() => handleEditCard(card)}
                    className="rounded min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white text-sm"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="rounded min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:bg-red-900/30 hover:text-red-400 text-sm"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditCardId(null); }}
        title={editCardId ? "Edit Card" : "Add Card"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Front</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question or term"
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Back</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Answer or definition"
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
          <Button onClick={handleSaveCard} className="w-full">
            {editCardId ? "Save Changes" : "Add Card"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
