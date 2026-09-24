"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDecks, getCards } from "@/lib/store";
import { selectStudyCards, filterStudyCards, type StudyMode } from "@/lib/study-queue";
import { CEFR_FILTER_OPTIONS, type CefrFilterValue } from "@/components/PairMeta";
import styles from "./StudySession.module.css";
import { StudyPrompt } from "./StudyPrompt";
import { StudyGradeActions } from "./StudyGradeActions";
import { saveReview } from "../study-quiz/saveReview";
import { shouldIgnoreShortcut } from "../study-quiz/keyboard";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import {
  DEFAULT_STUDY_SETTINGS,
  restorePendingCards,
  shufflePendingCards,
  type StudySettings,
} from "@/lib/study-settings";
import { formatElapsed } from "@/lib/match";
import { LoadError } from "@/components/LoadError";
import { errorMessage } from "@/lib/errors";
import { ArrowLeftIcon, CheckCircleIcon } from "@/components/StrokeIcons";

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

/** Fresh cards in a round's deck/level scope; deleted cards are never resurrected. */
function readScopedCards(deckId: string | undefined, level: CefrFilterValue, sets: Deck[] = getDecks(), cardIds?: ReadonlySet<string>): CardType[] {
  return filterStudyCards(getCards(), { deckIds: new Set(sets.map(deck => deck.id)), deckId, level, cardIds });
}

export function StudySession({ id, initialMode }: { id?: string; initialMode?: StudyMode }) {
  const [mode, setMode] = useState<StudyMode>(initialMode ?? (id ? "continue" : "due"));
  const [level, setLevel] = useState<CefrFilterValue>("All");
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS);
  const toolbar = (
    <div className={styles.toolbar}>
      <select aria-label="Flashcard selection" value={mode} onChange={event => setMode(event.target.value as StudyMode)} className={styles.select}>
        <option value="continue">Continue learning</option>
        <option value="learning">Still learning only</option>
        <option value="all">All terms</option>
        <option value="due">Due now only</option>
      </select>
      <select aria-label="CEFR level" value={level} onChange={event => setLevel(event.target.value as CefrFilterValue)} className={styles.select}>
        {CEFR_FILTER_OPTIONS.map(option => <option key={option} value={option}>{option === "All" ? "All levels" : option}</option>)}
      </select>
      <div className={styles.toggles} role="group" aria-label="Flashcard options">
        <button
          type="button"
          aria-pressed={settings.shuffle}
          className={styles.toggle}
          onClick={() => setSettings(current => ({ ...current, shuffle: !current.shuffle }))}
          title="Shuffle the remaining cards"
        >
          <Icon name="shuffle" width="15" height="15" /> Shuffle
        </button>
        <button
          type="button"
          aria-pressed={settings.swap}
          className={styles.toggle}
          onClick={() => setSettings(current => ({ ...current, swap: !current.swap }))}
          title="Show Thai first and recall the English word"
        >
          <Icon name="swap" width="15" height="15" /> Swap
        </button>
      </div>
    </div>
  );
  return <StudyRound key={`${id ?? "all"}:${mode}:${level}`} id={id} mode={mode} levelFilter={level} settings={settings} toolbar={toolbar} />;
}

function StudyRound({ id, mode, levelFilter, settings, toolbar }: { id?: string; mode: StudyMode; levelFilter: CefrFilterValue; settings: StudySettings; toolbar: ReactNode }) {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const deck = decks.find(d => d.id === id);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reviewedCard = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [dueCards, setDueCards] = useState<CardType[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalLen, setOriginalLen] = useState(0);
  const [shuffleNotice, setShuffleNotice] = useState("");
  // Total grade attempts (Still learning + Know). Used for session stats and progress.
  const [reviewed, setReviewed] = useState(0);
  // Session-scoped "missed this round" pile (Quizlet-style replay queue).
  // Distinct from persistent still-learning progress (lib/library.ts
  // cardProgress/deckProgress): this list resets every round.
  const [missedIds, setMissedIds] = useState<string[]>([]);
  // Keep the latest settings available to callbacks without restarting the
  // data-loading effect (and losing progress) when a toggle changes.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const currentIdxRef = useRef(currentIdx);
  currentIdxRef.current = currentIdx;
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const roundOrderRef = useRef<CardType[]>([]);
  const previousShuffleRef = useRef(settings.shuffle);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    try {
    const sets = getDecks();
    if (id && !sets.some(d => d.id === id)) {
      router.replace("/study");
      return;
    }
    setDecks(sets);
    const names = new Map(sets.map(d => [d.id, d.name]));
    const due = selectStudyCards(readScopedCards(id, levelFilter, sets), mode)
      .sort((a, b) => (names.get(a.deckId) ?? "").localeCompare(names.get(b.deckId) ?? "") || a.due - b.due);
    startRound(due);
    setLoadError("");
    } catch (cause) { setLoadError(errorMessage(cause, "Could not read saved cards.")); }
    finally { setLoading(false); }
  }, [id, mode, levelFilter, router, attempt]);

  useEffect(() => {
    if (finished) heading.current?.focus();
  }, [finished]);

  // Toggling Shuffle reorders only cards still ahead in the current round;
  // a revealed card remains pinned as the grading target.
  useEffect(() => {
    if (previousShuffleRef.current === settings.shuffle) return;
    previousShuffleRef.current = settings.shuffle;
    const index = currentIdxRef.current;
    const isRevealed = revealedRef.current;
    if (settings.shuffle) {
      setShuffleNotice(isRevealed ? "Current card stays in place while its answer is revealed." : "");
    } else {
      setShuffleNotice("");
    }
    setDueCards(previous => {
      return settings.shuffle
        ? shufflePendingCards(previous, index, isRevealed)
        : restorePendingCards(previous, roundOrderRef.current, index, isRevealed);
    });
  }, [settings.shuffle]);

  function handleReview(quality: number) {
    const card = dueCards[currentIdx];
    if (!card || finished || !revealed || reviewedCard.current === card.id) return;
    reviewedCard.current = card.id;
    try {
      saveReview(card.id, quality);
    } catch {
      reviewedCard.current = null;
      setError("Could not save your review. Please try again.");
      return;
    }
    setError("");
    setReviewed(r => r + 1);
    if (quality === 0) setMissedIds(prev => [...prev, card.id]);
    setRevealed(false);
    setShuffleNotice("");
    if (currentIdx + 1 >= dueCards.length) setFinished(true);
    else setCurrentIdx(i => i + 1);
  }

  function startRound(cards: CardType[]) {
    const original = [...cards];
    roundOrderRef.current = original;
    setDueCards(settingsRef.current.shuffle ? shufflePendingCards(original, 0, false) : original);
    startedAt.current = Date.now();
    setCurrentIdx(0);
    setOriginalLen(cards.length);
    setReviewed(0);
    setMissedIds([]);
    setFinished(cards.length === 0);
    setRevealed(false);
    setShuffleNotice("");
    setError("");
    reviewedCard.current = null;
  }

  function handleReviewMissed() {
    try { startRound(readScopedCards(id, levelFilter, undefined, new Set(missedIds))); }
    catch (cause) { setLoadError(errorMessage(cause, "Could not read saved cards.")); }
  }

  function handleRestart() {
    try { startRound(readScopedCards(id, levelFilter)); }
    catch (cause) { setLoadError(errorMessage(cause, "Could not read saved cards.")); }
  }

  useEffect(() => {
    if (finished || loading) return;
    function onKey(e: KeyboardEvent) {
      if (shouldIgnoreShortcut(e) || !revealed) return;
      if (e.key === "1" || e.key === "ArrowLeft") {
        e.preventDefault();
        handleReview(0);
      } else if (e.key === "2" || e.key === "ArrowRight") {
        e.preventDefault();
        handleReview(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loadError) return <LoadError message={loadError} onRetry={() => setAttempt(value => value + 1)} />;
  if (loading) {
    return (
      <div
        className="mx-auto w-full max-w-2xl"
        aria-busy="true"
        aria-label="Loading study session"
      >
        {toolbar}
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
      <div className="mx-auto w-full max-w-2xl">
        {toolbar}
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-500"
            aria-hidden="true"
          >
            <CheckCircleIcon className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h1 ref={heading} tabIndex={-1} className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {mode === "learning" ? "No terms still learning" : "Nothing to review"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {levelFilter !== "All"
              ? `No ${levelFilter} terms match this selection. Try All levels or add more ${levelFilter} terms.`
              : mode === "learning" ? "You can practice the full set again at any time." : "No terms match this selection. Choose All terms to practice anytime."}
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button className="w-full" onClick={handleRestart}>Practice all terms</Button>
            <Button className="w-full" onClick={() => router.push(id ? `/deck/${id}` : "/study")}>
              {id ? "Back to set" : "Back to study"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push(id ? "/study" : "/")}
            >
              {id ? "Study another set" : "Browse sets"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const card = dueCards[currentIdx];

  if (finished || !card) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        {toolbar}
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"
            aria-hidden="true"
          >
            <TrophyIcon />
          </div>
          <h1 ref={heading} tabIndex={-1} className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {missedIds.length > 0 ? "Round complete" : "Session complete"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {originalLen - missedIds.length} known · {missedIds.length} still
            learning in {deck?.name ?? "All sets"}
          </p>
          <dl className="round-stats">
            <div><dt>Known</dt><dd>{originalLen - missedIds.length}</dd></div>
            <div><dt>Still learning</dt><dd>{missedIds.length}</dd></div>
            <div><dt>Accuracy</dt><dd>{originalLen ? Math.round(((originalLen - missedIds.length) / originalLen) * 100) : 100}%</dd></div>
            <div><dt>Time</dt><dd>{formatElapsed(Date.now() - startedAt.current)}</dd></div>
          </dl>
          <div className="mt-6 flex w-full flex-col gap-2">
            {missedIds.length > 0 && (
              <Button className="w-full" onClick={handleReviewMissed}>
                Practice still learning · {missedIds.length} remaining
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={handleRestart}>Study all terms again</Button>
            <Button
              variant={missedIds.length > 0 ? "secondary" : undefined}
              className="w-full"
              onClick={() => router.push(id ? `/deck/${id}` : "/study")}
            >
              {id ? "Back to set" : "Back to study"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push(id ? "/study" : "/")}
            >
              {id ? "Study another set" : "Browse sets"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Single pass per round: position is progress.
  const position = Math.min(currentIdx + 1, dueCards.length);
  const progress =
    originalLen > 0 ? Math.min(100, Math.round((reviewed / originalLen) * 100)) : 100;
  const known = reviewed - missedIds.length;

  return (
    <div className={styles.stage}>
      <header className={styles.head}>
        <button
          type="button"
          onClick={() => router.push(id ? `/deck/${id}` : "/study")}
          aria-label={id ? "Back to set" : "Back to study"}
          className={styles.back}
        >
          <ArrowLeftIcon />
        </button>
        <div className={styles.titles}>
          <p className={styles.eyebrow}>{id ? "Flashcards" : `Flashcards · ${decks.find(d => d.id === card.deckId)?.name ?? ""}`}</p>
          <h1 className={styles.title}>{deck?.name ?? "All sets"}</h1>
        </div>
        <p className={styles.counter} aria-label={`Card ${position} of ${dueCards.length}`}>
          {position} / {dueCards.length}
        </p>
      </header>

      {toolbar}

      <div className={styles.score}>
        <span className={`${styles.chip} ${styles.chipLearning}`} title="Still learning this round">
          <span className="sr-only">Still learning: </span>{missedIds.length}
        </span>
        <ProgressBar value={progress} className={styles.track} />
        <span className={`${styles.chip} ${styles.chipKnow}`} title="Known this round">
          <span className="sr-only">Know: </span>{known}
        </span>
      </div>

      {/* Remount each prompt to restore keyboard focus after grading. */}
      <StudyPrompt key={card.id} card={card} revealed={revealed} swap={settings.swap} onReveal={() => setRevealed(true)} onReview={handleReview} />

      <p className={styles.hint} role="status">
        {shuffleNotice || (!revealed && (
          <span className={styles.keys}>Tap the card or press <kbd>Space</kbd> to reveal</span>
        ))}
      </p>

      {error && <p role="alert" className="mt-3 text-center text-rose-700">{error}</p>}
      <div className={styles.footer}>
        <StudyGradeActions revealed={revealed} onReview={handleReview} />
      </div>
    </div>
  );
}
