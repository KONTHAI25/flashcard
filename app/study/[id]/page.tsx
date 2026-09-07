"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDeck, getCardsByDeck, updateCard } from "@/lib/store";
import { isDue, reviewCard } from "@/lib/srs";
import { FlashCard } from "@/components/FlashCard";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ui";

function ArrowLeftIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function TrophyIcon({ className = "h-8 w-8" }: { className?: string }) {
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
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4" />
      <path d="M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4" />
    </svg>
  );
}

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

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [dueCards, setDueCards] = useState<CardType[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalLen, setOriginalLen] = useState(0);
  // Total grade attempts (Still learning + Know). Used for session stats and progress.
  const [reviewed, setReviewed] = useState(0);
  // Ids marked Still learning this round — Quizlet's missed pile, replayed as the next round.
  const [missedIds, setMissedIds] = useState<string[]>([]);

  useEffect(() => {
    const d = getDeck(id);
    if (!d) {
      router.push("/");
      return;
    }
    setDeck(d);
    const due = getCardsByDeck(id).filter(isDue);
    setDueCards(due);
    setOriginalLen(due.length);
    if (due.length === 0) setFinished(true);
    setLoading(false);
  }, [id, router]);

  // Quizlet official style: single pass per round. Grading always moves to the
  // NEXT card; Still learning files the card into the missed pile for the
  // next round. No same-round re-drill, no skip.
  function handleReview(quality: number) {
    const card = dueCards[currentIdx];
    if (!card || finished) return;
    const updated = reviewCard(card, quality);
    updateCard(card.id, updated);
    setReviewed((r) => r + 1);

    if (quality === 0) {
      setMissedIds((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
    }
    if (currentIdx + 1 >= dueCards.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  // Quizlet-style next round: drill only the missed pile.
  function startRound(cards: CardType[]) {
    setDueCards(cards);
    setCurrentIdx(0);
    setOriginalLen(cards.length);
    setReviewed(0);
    setMissedIds([]);
    setFinished(false);
  }

  function handleReviewMissed() {
    const round = missedIds
      .map((mid) => dueCards.find((c) => c.id === mid))
      .filter((c): c is CardType => Boolean(c));
    if (round.length > 0) startRound(round);
  }

  // Keyboard shortcuts: 1 / ArrowLeft = Still learning, 2 / ArrowRight = Know.
  // (Space/Enter flips the card via the focused FlashCard button.)
  // Re-subscribes every render so the handler never closes over stale state.
  useEffect(() => {
    if (finished || loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "1" || e.key === "ArrowLeft") handleReview(0);
      else if (e.key === "2" || e.key === "ArrowRight") handleReview(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading || !deck) {
    return (
      <div
        className="mx-auto w-full max-w-3xl"
        aria-busy="true"
        aria-label="Loading study session"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-6 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mb-6 h-2 animate-pulse rounded-full bg-slate-200" />
        <div className="min-h-[240px] flex-1 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state: deck had nothing due when the session loaded.
  if (finished && originalLen === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-500"
            aria-hidden="true"
          >
            <CheckCircleIcon />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            All caught up
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            No terms due in {deck.name} right now.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button className="w-full" onClick={() => router.push(`/deck/${id}`)}>
              Back to set
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/study")}
            >
              Study another set
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const card = dueCards[currentIdx];

  if (finished || !card) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"
            aria-hidden="true"
          >
            <TrophyIcon />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {missedIds.length > 0 ? "Round complete" : "Session complete"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {originalLen - missedIds.length} known · {missedIds.length} still
            learning in {deck.name}
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            {missedIds.length > 0 && (
              <Button className="w-full" onClick={handleReviewMissed}>
                Continue · {missedIds.length} remaining
              </Button>
            )}
            <Button
              variant={missedIds.length > 0 ? "secondary" : undefined}
              className="w-full"
              onClick={() => router.push(`/deck/${id}`)}
            >
              Back to set
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/study")}
            >
              Study another set
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Single pass per round: position is progress.
  const remaining = Math.max(0, dueCards.length - currentIdx);
  const position = Math.min(currentIdx + 1, dueCards.length);
  const progress =
    originalLen > 0 ? Math.min(100, Math.round((reviewed / originalLen) * 100)) : 100;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col min-h-[70dvh]">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/study")}
          aria-label="Back to study"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-slate-900">
          {deck.name}
        </h1>
        <p className="shrink-0 text-sm tabular-nums text-slate-500">
          {position} / {dueCards.length}
        </p>
      </div>

      <ProgressBar value={progress} className="mb-6" />

      <div className="flex-1">
        {/* key remounts the card per prompt so flip state never leaks across cards */}
        <FlashCard key={card.id} front={card.front} back={card.back} />
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Tap card to flip · {remaining} left in this round
      </p>

      <div
        className="sticky bottom-0 bg-[#F6F7FB]/95 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
          <Button
            variant="danger"
            size="grade"
            onClick={() => handleReview(0)}
            className="w-full"
            aria-label="Still learning (press 1)"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            <span className="truncate">Still learning</span>
            <kbd className="rounded border border-white/40 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white">
              1
            </kbd>
          </Button>
          <Button
            variant="success"
            size="grade"
            onClick={() => handleReview(1)}
            className="w-full"
            aria-label="Know (press 2)"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="truncate">Know</span>
            <kbd className="rounded border border-white/40 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white">
              2
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
