"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDeck, getCardsByDeck, updateCard } from "@/lib/store";
import { isDue, reviewCard } from "@/lib/srs";
import { FlashCard } from "@/components/FlashCard";
import { Button } from "@/components/Button";

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [dueCards, setDueCards] = useState<CardType[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [originalLen, setOriginalLen] = useState(0);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    const d = getDeck(id);
    if (!d) { router.push("/"); return; }
    setDeck(d);
    const due = getCardsByDeck(id).filter(isDue);
    setDueCards(due);
    setOriginalLen(due.length);
    if (due.length === 0) setFinished(true);
  }, [id, router]);

  function handleReview(quality: number) {
    const card = dueCards[currentIdx];
    if (!card) return;
    const updated = reviewCard(card, quality);
    updateCard(card.id, updated);
    setReviewed((r) => r + 1);

    if (quality === 0) {
      // Again — move card to end of queue, don't advance pointer
      setDueCards((prev) => {
        const next = [...prev];
        const [moved] = next.splice(currentIdx, 1);
        next.push(moved);
        return next;
      });
    } else if (currentIdx + 1 >= dueCards.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  if (!deck) return <p className="text-slate-500">Loading…</p>;

  const card = dueCards[currentIdx];
  // "Again" re-queues cards, so count remaining by cards not yet rated Good/Easy
  const remaining = dueCards.length - currentIdx;

  if (finished || !card) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
        <p className="text-slate-400 mb-6">
          You reviewed {dueCards.length} card{dueCards.length !== 1 ? "s" : ""}.
        </p>
        <Button onClick={() => router.push(`/deck/${id}`)}>
          Back to Deck
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-slate-400 hover:text-white">
          ←
        </button>
        <h1 className="text-xl font-bold">Studying: {deck.name}</h1>
      </div>

      <p className="mb-4 text-center text-sm text-slate-400">
        {remaining} card{remaining !== 1 ? "s" : ""} remaining
      </p>

      <FlashCard front={card.front} back={card.back} />

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Button variant="danger" onClick={() => handleReview(0)}>
          Again
        </Button>
        <Button onClick={() => handleReview(1)}>
          Good
        </Button>
        <Button variant="secondary" onClick={() => handleReview(2)}>
          Easy
        </Button>
      </div>

      {/* Progress bar — tracks total reviews vs original queue + re-queues */}
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width: `${Math.min(100, Math.round((reviewed / Math.max(1, originalLen)) * 100))}%`,
          }}
        />
      </div>
    </div>
  );
}
