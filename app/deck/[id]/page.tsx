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

function CardStackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M5 5v2" />
      <path d="M9 5v2" />
      <path d="M13 5v2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
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
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <p className="font-semibold text-slate-900">No terms yet</p>
      <p className="mb-4 text-sm text-slate-500">Add your first term to start studying.</p>
      <Button size="sm" onClick={onAdd}>
        <PlusIcon /> Add term
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading deck">
      <div className="mb-6 flex animate-pulse items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
      </div>
      <div className="mb-4 flex animate-pulse gap-3">
        <div className="h-16 flex-1 rounded-xl bg-slate-200" />
        <div className="h-16 flex-1 rounded-xl bg-slate-200" />
      </div>
      <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-1 gap-2 border-b border-slate-200 p-4 last:border-b-0 sm:grid-cols-[1fr_1fr_auto] sm:gap-4">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-6 w-16 rounded-full bg-slate-200" />
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
      {/* Title block */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
        >
          <ArrowLeftIcon />
        </button>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl shadow-sm">
          {deck.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{deck.name}</h1>
          <p className="text-sm text-slate-500">
            {cards.length} terms · {dueCount} due
          </p>
        </div>
      </div>

      {/* Study-modes row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          className="w-full"
          size="lg"
          disabled={dueCount === 0}
          title={dueCount === 0 ? "No cards due — come back later" : `Study ${dueCount} due cards`}
          onClick={() => router.push(`/study/${id}`)}
        >
          <CardStackIcon />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="font-semibold">Flashcards</span>
            <span className="text-xs font-normal opacity-80">Study {dueCount} due</span>
          </span>
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          size="lg"
          disabled={quizDisabled}
          title={quizDisabled ? `Add ${4 - cards.length} more card(s) to unlock Quiz` : `Quiz on ${cards.length} cards`}
          onClick={() => router.push(`/quiz/${id}`)}
        >
          <CheckCircleIcon />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="font-semibold">Test</span>
            <span className="text-xs font-normal opacity-80">Quiz · {cards.length}</span>
          </span>
        </Button>
      </div>

      {/* Terms section */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Terms ({cards.length})</h2>
        <Button size="sm" onClick={handleOpenAdd}>
          <PlusIcon /> Add term
        </Button>
      </div>

      {cards.length === 0 ? (
        <EmptyState onAdd={handleOpenAdd} />
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {cards.map((card) => {
            const due = isDue(card);
            return (
              <div
                key={card.id}
                className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <p className="break-words font-medium text-slate-900">{card.front}</p>
                <p className="break-words text-slate-600">{card.back}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge due={due}>{due ? "Due" : nextReviewLabel(card)}</Badge>
                  <button
                    onClick={() => handleEditCard(card)}
                    aria-label={`Edit card: ${card.front}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    aria-label={`Delete card: ${card.front}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
                  >
                    <TrashIcon />
                  </button>
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
            <label htmlFor="card-front" className="mb-1 block text-sm font-medium text-slate-700">
              Front
            </label>
            <textarea
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question or term"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="card-back" className="mb-1 block text-sm font-medium text-slate-700">
              Back
            </label>
            <textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Answer or definition"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
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
