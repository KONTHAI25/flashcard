"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDeck, getCardsByDeck, updateCard } from "@/lib/store";
import { isDue, reviewCard } from "@/lib/srs";
import { FlashCard } from "@/components/FlashCard";
import { Button } from "@/components/Button";

function BackIcon({ className = "h-5 w-5" }: { className?: string }) {
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

function TrophyIcon({ className = "h-12 w-12" }: { className?: string }) {
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

function CheckCircleIcon({ className = "h-12 w-12" }: { className?: string }) {
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

function GradeButton({
  label,
  hint,
  onGrade,
  className,
}: {
  label: string;
  hint: string;
  onGrade: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onGrade}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.97] ${className}`}
    >
      <span>{label}</span>
      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none opacity-80">
        {hint}
      </kbd>
    </button>
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
  // Total grade attempts (Again + Good + Easy). Used for session stats and progress.
  const [reviewed, setReviewed] = useState(0);
  // Number of Again re-queues. Total work = originalLen + requeues, so
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
      // Again — re-queue the (updated) card at the end, keep pointer in place.
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

  // Keyboard shortcuts: 1 = Again, 2 = Good, 3 = Easy.
  // (Space/Enter flips the card via the focused FlashCard button.)
  // Re-subscribes every render so the handler never closes over stale state.
  useEffect(() => {
    if (finished || loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "1") handleReview(0);
      else if (e.key === "2") handleReview(1);
      else if (e.key === "3") handleReview(2);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading || !deck) {
    return (
      <div aria-busy="true" aria-label="Loading study session">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-6 w-40 animate-pulse rounded-lg bg-slate-800" />
        </div>
        <div className="mb-4 h-1.5 animate-pulse overflow-hidden rounded-full bg-slate-800" />
        <div className="mx-auto max-w-md">
          <div className="min-h-[260px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state: deck had nothing due when the session loaded.
  if (finished && originalLen === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center pt-24 text-center">
        <span className="mb-4 text-emerald-400">
          <CheckCircleIcon />
        </span>
        <h1 className="text-2xl font-bold">All caught up</h1>
        <p className="mb-2 mt-1 text-sm text-slate-400">
          No cards due in {deck.name} right now.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button className="w-full" onClick={() => router.push(`/deck/${id}`)}>
            Back to Deck
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => router.push("/study")}>
            Study another deck
          </Button>
        </div>
      </div>
    );
  }

  const card = dueCards[currentIdx];

  if (finished || !card) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center pt-24 text-center">
        <span className="mb-4 text-amber-300">
          <TrophyIcon />
        </span>
        <h1 className="text-2xl font-bold">Session complete</h1>
        <p className="mb-6 mt-1 text-sm text-slate-400">
          Reviewed {reviewed} · {originalLen} due in {deck.name}
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button className="w-full" onClick={() => router.push(`/deck/${id}`)}>
            Back to Deck
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => router.push("/study")}>
            Study another deck
          </Button>
        </div>
      </div>
    );
  }

  // Queue accounting: Again splices + pushes, so length is stable and the
  // pointer only advances on Good/Easy. Remaining excludes resolved cards.
  const remaining = Math.max(0, dueCards.length - currentIdx);
  const position = Math.min(currentIdx + 1, dueCards.length);
  const total = originalLen + requeues;
  const progress =
    total > 0 ? Math.min(100, Math.round((reviewed / total) * 100)) : 100;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <BackIcon />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{deck.name}</h1>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          Card {position} of {dueCards.length}
        </p>
      </div>

      <div
        className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Study progress"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto max-w-md">
        {/* key remounts the card per prompt so flip state never leaks across cards */}
        <FlashCard key={card.id} front={card.front} back={card.back} />

        <p className="mt-3 text-center text-xs text-slate-500">
          Tap card to flip · {remaining} left in queue
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <GradeButton
            label="Again"
            hint="1"
            onGrade={() => handleReview(0)}
            className="border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          />
          <GradeButton
            label="Good"
            hint="2"
            onGrade={() => handleReview(1)}
            className="bg-blue-600 text-white hover:bg-blue-500"
          />
          <GradeButton
            label="Easy"
            hint="3"
            onGrade={() => handleReview(2)}
            className="border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
          />
        </div>
      </div>
    </div>
  );
}
