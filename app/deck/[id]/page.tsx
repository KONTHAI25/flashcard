"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeckPreview } from "@/components/DeckPreview";
import styles from "./deck.module.css";
import { Deck, Card as CardType } from "@/lib/types";
import { getDeck, getCardsByDeck, createCard, deleteCard, restoreCard, updateCard } from "@/lib/store";
import { isDue } from "@/lib/srs";
import { Button } from "@/components/Button";
import { showToast } from "@/components/Toast";
import { Sheet } from "@/components/Sheet";
import { buildQuiz } from "@/app/quiz/quiz";

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
    <div aria-busy="true" aria-label="Loading set">
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
          <div key={i} className="grid grid-cols-1 gap-2 border-b border-slate-200 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-4">
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

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const loadDeck = useCallback(() => {
    setLoading(true);
    setReadError(null);
    try {
      const nextDeck = getDeck(id);
      const nextCards = nextDeck ? getCardsByDeck(id) : [];
      setDeck(nextDeck ?? null);
      setCards(nextCards);
    } catch {
      setReadError("Could not read this set from browser storage. Try again.");
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadDeck(); }, [loadDeck]);

  function handleSaveCard() {
    if (!front.trim() || !back.trim()) {
      setFormError("Enter both sides before saving.");
      return;
    }
    try {
      const saved = editCardId
        ? updateCard(editCardId, { front: front.trim(), back: back.trim() })
        : createCard(id, front.trim(), back.trim());
      if (!saved) {
        setFormError("This term no longer exists. Close the editor and reload the set.");
        return;
      }
      setCards((previous) => editCardId
        ? previous.map((card) => card.id === saved.id ? saved : card)
        : [...previous, saved]);
      setFront(""); setBack(""); setEditCardId(null); setSheetOpen(false);
      setFormError(null); setQuery("");
      showToast(editCardId ? "Changes saved" : "Term added");
    } catch {
      setFormError("Could not save. Your text is still here. Check browser storage and try again.");
    }
  }

  function handleEditCard(card: CardType) {
    setFormError(null);
    setFront(card.front);
    setBack(card.back);
    setEditCardId(card.id);
    setSheetOpen(true);
  }

  function handleDeleteCard(cardId: string) {
    try {
      const removed = deleteCard(cardId);
      if (!removed) {
        showToast("This term no longer exists. Reload the set to update the list.");
        return;
      }
      setCards((previous) => previous.filter((card) => card.id !== cardId));
      showToast("Deleted term", {
        label: "Undo",
        onUndo: () => {
          // Restoration failures must reach ToastHost, which keeps Undo available.
          restoreCard(removed);
          setCards((previous) => previous.some((card) => card.id === removed.id)
            ? previous : [...previous, removed]);
        },
      });
    } catch { showToast("Could not delete this term. Please try again."); }
  }

  function handleOpenAdd() {
    setFormError(null);
    setFront("");
    setBack("");
    setEditCardId(null);
    setSheetOpen(true);
  }

  const dueCount = cards.filter(isDue).length;
  const canSave = front.trim().length > 0 && back.trim().length > 0;
  const quizDisabled = useMemo(() => buildQuiz(cards).length === 0, [cards]);

  const search = query.trim().toLocaleLowerCase();
  const visibleCards = cards.filter((card) =>
    card.front.toLocaleLowerCase().includes(search) || card.back.toLocaleLowerCase().includes(search));
  if (loading) return <LoadingSkeleton />;
  if (readError || !deck) return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">{readError ? "Unable to load set" : "Set not found"}</h1>
      <p role={readError ? "alert" : undefined}>{readError ?? "This set may have been deleted."}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={loadDeck}>Try again</Button>
        <Button variant="secondary" onClick={() => router.push("/")}>Back to sets</Button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.breadcrumb}>
        <ArrowLeftIcon /> Your library
      </Link>
      <header className={styles.title}>
        <span className={styles.emoji} aria-hidden="true">{deck.emoji}</span>
        <div className="min-w-0">
          <h1>{deck.name}</h1>
          <div className={styles.metadata}>
            <span className={styles.termCount}>{cards.length} terms</span>
            <span>{dueCount} due for review</span>
          </div>
        </div>
      </header>

      <nav className={styles.modes} aria-label="Study this set">
        <div>
          {dueCount > 0 ? (
            <Link href={`/study/${id}`} className={`${styles.mode} ${styles.modePrimary}`}>
              <CardStackIcon /> Flashcards <span className={styles.modeArrow} aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className={styles.mode} role="link" aria-disabled="true" aria-describedby="study-help">
              <CardStackIcon /> Flashcards
            </span>
          )}
          {dueCount === 0 && <p id="study-help" className={styles.modeHelp}>
            {cards.length === 0 ? "Add a term to start studying." : "All caught up. Browse the preview or return when terms are due."}
          </p>}
        </div>
        <div>
          {!quizDisabled ? (
            <Link href={`/quiz/${id}`} className={styles.mode}>
              <CheckCircleIcon /> Practice quiz <span className={styles.modeArrow} aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className={styles.mode} role="link" aria-disabled="true" aria-describedby="quiz-help">
              <CheckCircleIcon /> Practice quiz
            </span>
          )}
          {quizDisabled && <p id="quiz-help" className={styles.modeHelp}>
            Add at least 4 distinct answers with unambiguous prompts to unlock the quiz.
          </p>}
        </div>
      </nav>

      <DeckPreview key={id} cards={cards} />

      {/* Mastery bar: not started · remaining (played, not yet Know) · learned */}
      {(() => {
        const total = cards.length;
        // Learned = last result was Know (streak ≥ 1). Remaining = attempted
        // but not closed out with Know (streak reset to 0 by Still learning,
        // review pushed due past creation). Else never attempted.
        const learned = cards.filter((c) => c.streak >= 1).length;
        const remaining = cards.filter((c) => c.streak < 1 && c.due > c.createdAt).length;
        const notStarted = total - learned - remaining;
        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
        const learnedPct = total > 0 ? Math.round((learned / total) * 100) : 0;
        return (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Mastery</p>
              <p className="text-xs tabular-nums text-slate-500">{learnedPct}% learned</p>
            </div>
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={learnedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Set mastery"
            >
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct(learned)}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct(remaining)}%` }} />
              <div className="h-full bg-slate-300 transition-all" style={{ width: `${pct(notStarted)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-300" />
                {notStarted} not started
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
                {remaining} remaining
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                {learned} learned
              </span>
            </div>
          </div>
        );
      })()}

      {/* Terms section */}
      <div className={`${styles.terms} mb-4 flex items-center justify-between gap-3`}>
        <h2 className="text-lg font-bold text-slate-900">Terms in this set ({cards.length})</h2>
        <Button size="sm" onClick={handleOpenAdd}>
          <PlusIcon /> Add term
        </Button>
      </div>

      {cards.length > 0 && <div className="mb-4 space-y-2">
        <label htmlFor="term-search" className="block text-sm font-medium text-slate-700">Search terms and definitions</label>
        <div className="flex gap-2">
          <input id="term-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a term" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base" />
          {query && <Button variant="secondary" onClick={() => setQuery("")}>Clear</Button>}
        </div>
        <p role="status" className="text-sm text-slate-500">Showing {visibleCards.length} of {cards.length} terms</p>
      </div>}
      {cards.length === 0 ? (
        <EmptyState onAdd={handleOpenAdd} />
      ) : visibleCards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">No matching terms. Try another search.</p>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {visibleCards.map((card) => {
            return (
              <div
                key={card.id}
                className="grid grid-cols-1 gap-3 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-center sm:gap-6"
              >
                <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] break-words font-medium text-slate-900">{card.front}</p>
                <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-slate-600 sm:border-l sm:border-slate-200 sm:pl-6">{card.back}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleEditCard(card)}
                    aria-label={`Edit term: ${card.front}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    aria-label={`Delete term: ${card.front}`}
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
        title={editCardId ? "Edit term" : "Add term"}
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); handleSaveCard(); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
              event.preventDefault(); event.currentTarget.requestSubmit();
            }
          }}>
          <p className="text-sm text-slate-500">Both sides are required. Use Ctrl+Enter or Command+Enter to save.</p>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <div>
            <label htmlFor="card-front" className="mb-1 block text-sm font-medium text-slate-700">
              Front
            </label>
            <textarea
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question or term"
              rows={4}
              required
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
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
              rows={4}
              required
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!canSave}>
            {editCardId ? "Save Changes" : "Add term"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(false)}>Cancel</Button>
        </form>
      </Sheet>
    </div>
  );
}
