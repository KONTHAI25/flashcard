"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Deck, Card as CardType } from "@/lib/types";
import { getDeck, getCardsByDeck, createCard, deleteCard, updateCard } from "@/lib/store";
import { isDue, nextReviewLabel } from "@/lib/srs";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";

function ArrowLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function Badge({ due, children }: { due: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        due
          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
          : "border-white/5 bg-slate-800 text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 text-center">
      <p className="mb-2 text-3xl" aria-hidden="true">
        🃏
      </p>
      <p className="font-medium text-slate-300">No cards yet</p>
      <p className="mb-4 text-sm text-slate-500">Add your first card to start studying.</p>
      <Button size="sm" onClick={onAdd}>
        <PlusIcon /> Add Card
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading deck">
      <div className="mb-6 flex animate-pulse items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-slate-800" />
          <div className="h-4 w-24 rounded bg-slate-800" />
        </div>
      </div>
      <div className="mb-4 flex animate-pulse gap-2">
        <div className="h-12 flex-1 rounded-xl bg-slate-800" />
        <div className="h-12 flex-1 rounded-xl bg-slate-800" />
      </div>
      <div className="animate-pulse space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-slate-900/70 p-3.5">
            <div className="h-4 w-3/4 rounded bg-slate-800" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
    if (!window.confirm("Delete this card? This cannot be undone.")) return;
    deleteCard(cardId);
    refresh();
  }

  function handleOpenAdd() {
    setFront("");
    setBack("");
    setEditCardId(null);
    setSheetOpen(true);
  }

  const dueCount = cards.filter(isDue).length;
  const canSave = front.trim().length > 0 && back.trim().length > 0;
  const quizDisabled = cards.length < 4;

  if (!deck) return <LoadingSkeleton />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeftIcon />
        </button>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-2xl">
          {deck.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{deck.name}</h1>
          <p className="text-sm text-slate-400">
            {cards.length} cards · {dueCount} due
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <Button
            className="w-full"
            size="lg"
            disabled={dueCount === 0}
            title={dueCount === 0 ? "No cards due — come back later" : `Study ${dueCount} due cards`}
            onClick={() => router.push(`/study/${id}`)}
          >
            <BrainIcon /> Study · {dueCount} due
          </Button>
        </div>
        <div className="flex-1">
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            disabled={quizDisabled}
            title={quizDisabled ? `Add ${4 - cards.length} more card(s) to unlock Quiz` : `Quiz on ${cards.length} cards`}
            onClick={() => router.push(`/quiz/${id}`)}
          >
            Quiz · {cards.length}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Cards</h2>
        <Button size="sm" onClick={handleOpenAdd}>
          <PlusIcon /> Add Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <EmptyState onAdd={handleOpenAdd} />
      ) : (
        <div className="space-y-2">
          {cards.map((card) => {
            const due = isDue(card);
            return (
              <div
                key={card.id}
                className="rounded-xl border border-white/5 bg-slate-900/70 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium line-clamp-2">{card.front}</p>
                    <p className="break-words text-sm text-slate-400 line-clamp-1">{card.back}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge due={due}>{due ? "due" : nextReviewLabel(card)}</Badge>
                    <button
                      onClick={() => handleEditCard(card)}
                      aria-label={`Edit card: ${card.front}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      aria-label={`Delete card: ${card.front}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditCardId(null); }}
        title={editCardId ? "Edit Card" : "Add Card"}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="card-front" className="mb-1 block text-sm text-slate-400">
              Front
            </label>
            <textarea
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question or term"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="card-back" className="mb-1 block text-sm text-slate-400">
              Back
            </label>
            <textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Answer or definition"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <Button onClick={handleSaveCard} className="w-full" disabled={!canSave}>
            {editCardId ? "Save Changes" : "Add Card"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
