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

function ChevronLeftIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <path d="m15 18-6-6 6-6" />
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
      <path d="m9 18 6-6-6-6" />
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
  // Total grade attempts (Still learning + Got it + Easy). Used for session stats and progress.
  const [reviewed, setReviewed] = useState(0);
  // Number of Still-learning re-queues. Total work = originalLen + requeues, so
  // progress = reviewed / (originalLen + requeues) === reviewed / (reviewed + remaining).
  const [requeues, setRequeues] = useState(0);

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

  function handleReview(quality: number) {
    const card = dueCards[currentIdx];
    if (!card || finished) return;
    const updated = reviewCard(card, quality);
    updateCard(card.id, updated);
    setReviewed((r) => r + 1);

    if (quality === 0) {
      // Still learning — re-queue the (updated) card at the end, keep pointer in place.
      setRequeues((q) => q + 1);
      setDueCards((prev) => {
        const next = [...prev];
        next.splice(currentIdx, 1);
        next.push(updated);
        return next;
      });
    } else if (currentIdx + 1 >= dueCards.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  // Pointer-only navigation: never grades, never mutates stored cards.
  function handlePrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    setCurrentIdx((i) => Math.min(dueCards.length - 1, i + 1));
  }

  // Keyboard shortcuts: 1 = Still learning, 2 = Got it, 3 = Easy.
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
      if (e.key === "1") handleReview(0);
      else if (e.key === "2") handleReview(1);
      else if (e.key === "3") handleReview(2);
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
        <div className="flex items-center gap-3">
          <div className="hidden h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-200 sm:block" />
          <div className="min-h-[280px] flex-1 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="hidden h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-200 sm:block" />
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
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
            Session complete
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Reviewed {reviewed} · {originalLen}{" "}
            {originalLen === 1 ? "term" : "terms"} due in {deck.name}
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

  // Queue accounting: Still learning splices + pushes, so length is stable and the
  // pointer only advances on Got it / Easy. Remaining excludes resolved cards.
  const remaining = Math.max(0, dueCards.length - currentIdx);
  const position = Math.min(currentIdx + 1, dueCards.length);
  const total = originalLen + requeues;
  const progress =
    total > 0 ? Math.min(100, Math.round((reviewed / total) * 100)) : 100;

  const prevDisabled = currentIdx <= 0;
  const nextDisabled = currentIdx >= dueCards.length - 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
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

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={prevDisabled}
          aria-label="Previous card"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500"
        >
          <ChevronLeftIcon />
        </button>

        <div className="min-w-0 flex-1">
          {/* key remounts the card per prompt so flip state never leaks across cards */}
          <FlashCard key={card.id} front={card.front} back={card.back} />
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={nextDisabled}
          aria-label="Next card"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Tap card to flip · {remaining} left in queue
      </p>

      <div className="mx-auto mt-4 grid max-w-2xl grid-cols-3 gap-3">
        <Button
          variant="secondary"
          onClick={() => handleReview(0)}
          className="w-full"
          aria-label="Still learning (press 1)"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-rose-500"
          />
          <span className="truncate text-rose-600">Still learning</span>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-slate-500">
            1
          </kbd>
        </Button>
        <Button
          variant="primary"
          onClick={() => handleReview(1)}
          className="w-full"
          aria-label="Got it (press 2)"
        >
          <span className="truncate">Got it</span>
          <kbd className="rounded border border-white/40 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white">
            2
          </kbd>
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleReview(2)}
          className="w-full"
          aria-label="Easy (press 3)"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
          />
          <span className="truncate text-emerald-600">Easy</span>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-slate-500">
            3
          </kbd>
        </Button>
      </div>
    </div>
  );
}
