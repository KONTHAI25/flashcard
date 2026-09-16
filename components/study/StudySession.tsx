"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDecks, getCards } from "@/lib/store";
import { selectStudyCards, filterStudyCards, type StudyMode } from "@/lib/study-queue";
import { CefrFilter, type CefrFilterValue } from "@/components/PairMeta";
import { StudyPrompt } from "./StudyPrompt";
import { saveReview } from "../study-quiz/saveReview";
import { shouldIgnoreShortcut } from "../study-quiz/keyboard";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { DEFAULT_STUDY_SETTINGS, shuffleCards, type StudySettings } from "@/lib/study-settings";
import { formatElapsed } from "@/lib/match";
import { LoadError } from "@/components/LoadError";

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

export function StudySession({ id, initialMode }: { id?: string; initialMode?: StudyMode }) {
  const [mode, setMode] = useState<StudyMode>(initialMode ?? (id ? "continue" : "due"));
  const [level, setLevel] = useState<CefrFilterValue>("All");
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS);
  return <div>
    <div className="study-controls">
      <label className="study-practice">
        Practice
        <select aria-label="Flashcard selection" value={mode} onChange={event => setMode(event.target.value as StudyMode)} className="field w-auto">
          <option value="continue">Continue learning</option>
          <option value="learning">Still learning only</option>
          <option value="all">All terms</option>
          <option value="due">Due now only</option>
        </select>
      </label>
      <CefrFilter value={level} onChange={setLevel} idPrefix="study-cefr" />
      <div className="study-settings" role="group" aria-label="Flashcard options">
        <button
          type="button"
          aria-pressed={settings.shuffle}
          className={`study-setting${settings.shuffle ? " active" : ""}`}
          onClick={() => setSettings(current => ({ ...current, shuffle: !current.shuffle }))}
          title="Shuffle the remaining cards"
        >
          <Icon name="shuffle" width="16" height="16" /> Shuffle
        </button>
        <button
          type="button"
          aria-pressed={settings.swap}
          className={`study-setting${settings.swap ? " active" : ""}`}
          onClick={() => setSettings(current => ({ ...current, swap: !current.swap }))}
          title="Show Thai first and recall the English word"
        >
          <Icon name="swap" width="16" height="16" /> Swap
        </button>
      </div>
    </div>
    <StudyRound key={`${id ?? "all"}:${mode}:${level}`} id={id} mode={mode} levelFilter={level} settings={settings} />
  </div>;
}

function StudyRound({ id, mode, levelFilter, settings }: { id?: string; mode: StudyMode; levelFilter: CefrFilterValue; settings: StudySettings }) {
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
    const due = selectStudyCards(filterStudyCards(getCards(), { deckIds: new Set(names.keys()), deckId: id, level: levelFilter }), mode)
      .sort((a, b) => (names.get(a.deckId) ?? "").localeCompare(names.get(b.deckId) ?? "") || a.due - b.due);
    startRound(due);
    setLoadError("");
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Could not read saved cards."); }
    finally { setLoading(false); }
  }, [id, mode, levelFilter, router, attempt]);

  useEffect(() => {
    if (finished) heading.current?.focus();
  }, [finished]);

  // Toggling Shuffle reorders only the cards still ahead in the current round;
  // graded progress and saved schedules are untouched.
  useEffect(() => {
    if (!settings.shuffle) return;
    setDueCards(previous => {
      const index = Math.min(currentIdxRef.current + 1, previous.length);
      return [...previous.slice(0, index), ...shuffleCards(previous.slice(index))];
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
    if (currentIdx + 1 >= dueCards.length) setFinished(true);
    else setCurrentIdx(i => i + 1);
  }

  function startRound(cards: CardType[]) {
    setDueCards(settingsRef.current.shuffle ? shuffleCards(cards) : [...cards]);
    startedAt.current = Date.now();
    setCurrentIdx(0);
    setOriginalLen(cards.length);
    setReviewed(0);
    setMissedIds([]);
    setFinished(cards.length === 0);
    setRevealed(false);
    setError("");
    reviewedCard.current = null;
  }

  function handleReviewMissed() {
    // Reload both content and schedule; deleted cards must not be resurrected.
    const ids = new Set(missedIds);
    try { startRound(filterStudyCards(getCards(), { deckIds: new Set(getDecks().map(deck => deck.id)), deckId: id, level: levelFilter, cardIds: ids })); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Could not read saved cards."); }
  }

  function handleRestart() {
    try {
      const existingDecks = new Set(getDecks().map(deck => deck.id));
      startRound(filterStudyCards(getCards(), { deckIds: existingDecks, deckId: id, level: levelFilter }));
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Could not read saved cards."); }
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
      <div className="mx-auto w-full max-w-3xl">
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
  const remaining = Math.max(0, dueCards.length - currentIdx);
  const position = Math.min(currentIdx + 1, dueCards.length);
  const progress =
    originalLen > 0 ? Math.min(100, Math.round((reviewed / originalLen) * 100)) : 100;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col min-h-[70dvh]">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(id ? `/deck/${id}` : "/study")}
          aria-label={id ? "Back to set" : "Back to study"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-slate-900">
          {deck?.name ?? "All sets"}
        </h1>
        <p className="shrink-0 text-sm tabular-nums text-slate-500">
          {position} / {dueCards.length}
        </p>
      </div>

      <ProgressBar value={progress} className="mb-6" />

      <div className="flex-1">
        {/* Remount each prompt to restore keyboard focus after grading. */}
        {!id && <p className="mb-3 text-sm text-slate-500">Set: {decks.find(d => d.id === card.deckId)?.name}</p>}
        <StudyPrompt key={card.id} card={card} revealed={revealed} swap={settings.swap} onReveal={() => setRevealed(true)} onReview={handleReview} />
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Reveal the answer, then grade · {remaining} left in this round
      </p>

      {error && <p role="alert" className="mt-3 text-rose-700">{error}</p>}
      <div
        className="sticky bottom-0 bg-[#F6F7FB]/95 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
          <Button
            variant="danger"
            size="grade"
            disabled={!revealed}
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
            disabled={!revealed}
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
