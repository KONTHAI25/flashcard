"use client";

import { useState, useEffect, useCallback, useMemo, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeckPreview } from "@/components/DeckPreview";
import styles from "./deck.module.css";
import { Deck, Card as CardType, normalizeCard, getDisplayBack, isBilingualCard, CEFR_LEVELS, type CEFRLevel, type CardSource } from "@/lib/types";
import { getDeck, getCardsByDeck, createCard, deleteCard, restoreCard, updateCard } from "@/lib/store";
import { isDue } from "@/lib/srs";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/ui";
import { showToast } from "@/components/Toast";
import { Sheet } from "@/components/Sheet";
import { canBuildQuiz } from "@/app/quiz/quiz";
import { fetchTranslate, type TranslateCandidate } from "@/lib/translate";
import { LevelBadge, SourceTag, CefrFilter, type CefrFilterValue } from "@/components/PairMeta";
import { deckProgress } from "@/lib/library";
import { answerMatchesWord, beginLookup, canAutoReplaceAnswer, isLookupCurrent, resolveSaveSource, type LookupRequest } from "@/lib/editor-state";

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

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
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

type LookupStatus = "idle" | "loading" | "done" | "error";

const EMPTY_LEVEL = "" as const;
type EditorLevel = CEFRLevel | typeof EMPTY_LEVEL;

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [level, setLevel] = useState<EditorLevel>(EMPTY_LEVEL);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<CardSource | null>(null);
  const [editingBilingual, setEditingBilingual] = useState(false);
  const [answerWord, setAnswerWord] = useState<string | null>(null);
  const [answerEdited, setAnswerEdited] = useState(false);

  const [query, setQuery] = useState("");
  const [cefrFilter, setCefrFilter] = useState<CefrFilterValue>("All");
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // EN→TH lookup state (Longdo via /api/translate).
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TranslateCandidate[]>([]);
  const [lookupPos, setLookupPos] = useState<string | null>(null);
  const [usedLongdo, setUsedLongdo] = useState(false);
  const [thaiTouched, setThaiTouched] = useState(false);
  const lookupSeq = useRef(0);
  const lastAutoWord = useRef("");
  const autoFilledAnswer = useRef<{ word: string; answer: string } | null>(null);
  const frontRef = useRef(front);
  const backRef = useRef(back);
  const answerWordRef = useRef(answerWord);
  const thaiTouchedRef = useRef(thaiTouched);
  const sheetOpenRef = useRef(sheetOpen);
  const activeRequest = useRef<LookupRequest | null>(null);
  frontRef.current = front;
  backRef.current = back;
  answerWordRef.current = answerWord;
  thaiTouchedRef.current = thaiTouched;
  sheetOpenRef.current = sheetOpen;

  const loadDeck = useCallback((background = false) => {
    if (!background) setLoading(true);
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
  useEffect(() => {
    loadDeck();
    const refreshInBackground = () => { void loadDeck(true); };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshInBackground();
    };
    window.addEventListener("storage", refreshInBackground);
    window.addEventListener("flashcards:change", refreshInBackground);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => {
      window.removeEventListener("storage", refreshInBackground);
      window.removeEventListener("flashcards:change", refreshInBackground);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [loadDeck]);

  const runLookup = useCallback(async (word: string, auto: boolean) => {
    const trimmed = word.trim();
    if (!trimmed || !sheetOpenRef.current || trimmed !== frontRef.current.trim()) return;
    if (auto && !canAutoReplaceAnswer(
      thaiTouchedRef.current,
      answerWordRef.current,
      frontRef.current,
      backRef.current,
    )) return;
    const request = beginLookup(lookupSeq.current, trimmed);
    lookupSeq.current = request.generation;
    activeRequest.current = request;
    setLookupStatus("loading");
    setLookupError(null);
    setCandidates([]);
    setLookupPos(null);
    setUsedLongdo(false);
    try {
      const result = await fetchTranslate(trimmed) as Awaited<ReturnType<typeof fetchTranslate>> & { error?: string };
      if (!isLookupCurrent(request, lookupSeq.current, frontRef.current, sheetOpenRef.current)) return;
      const list = result.candidates ?? [];
      if (list.length === 0) {
        setLookupStatus("error");
        setLookupError(
          result.error
            ? `Lookup didn't return a Thai meaning (${result.error}). Type the meaning by hand.`
            : `No Thai entry found for "${trimmed}". Type the meaning by hand.`,
        );
        return;
      }
      setCandidates(list);
      setLookupPos(result.pos ?? list[0]?.pos ?? null);
      // Auto-fill only overwrites an empty or unprotected answer. Manual
      // lookup is an explicit replacement request and may replace it.
      const mayReplace = !auto || canAutoReplaceAnswer(
        thaiTouchedRef.current,
        answerWordRef.current,
        frontRef.current,
        backRef.current,
      );
      if (mayReplace) {
        backRef.current = result.word_thai;
        setBack(result.word_thai);
        setThaiTouched(false);
        thaiTouchedRef.current = false;
        setAnswerWord(trimmed);
        answerWordRef.current = trimmed;
        setAnswerEdited(false);
        autoFilledAnswer.current = { word: trimmed, answer: result.word_thai };
        setUsedLongdo(true);
      } else {
        // Keep the candidates available for an explicit choice, but do not
        // claim Longdo provenance for the protected hand-entered answer.
        setUsedLongdo(false);
      }
      lastAutoWord.current = trimmed;
      setLookupStatus("done");
    } catch (err) {
      if (!isLookupCurrent(request, lookupSeq.current, frontRef.current, sheetOpenRef.current)) return;
      setLookupStatus("error");
      setLookupError(err instanceof Error ? `${err.message}. You can still type the meaning by hand.` : "Lookup failed. You can still type the meaning by hand.");
    }
  }, []);

  // Debounced auto-lookup: fills the Thai field shortly after the user stops
  // typing English, but never clobbers a hand-edited translation.
  useEffect(() => {
    if (!sheetOpen) return;
    const word = front.trim();
    if (word.length < 2 || word === lastAutoWord.current) return;
    if (thaiTouched && back.trim()) return;
    const timer = setTimeout(() => { void runLookup(word, true); }, 650);
    return () => clearTimeout(timer);
  }, [front, back, thaiTouched, sheetOpen, runLookup]);

  function resetTranslateState() {
    lookupSeq.current += 1;
    activeRequest.current = null;
    lastAutoWord.current = "";
    autoFilledAnswer.current = null;
    setLookupStatus("idle");
    setLookupError(null);
    setCandidates([]);
    setLookupPos(null);
    setUsedLongdo(false);
  }

  function handleFrontChange(value: string) {
    // A front edit makes every pending response and prior answer association
    // stale. Clear the displayed meaning so a failed replacement lookup can
    // never be saved against the new word.
    lookupSeq.current += 1;
    activeRequest.current = null;
    lastAutoWord.current = "";
    autoFilledAnswer.current = null;
    frontRef.current = value;
    backRef.current = "";
    answerWordRef.current = null;
    thaiTouchedRef.current = false;
    setFront(value);
    setBack("");
    setAnswerWord(null);
    setAnswerEdited(false);
    setThaiTouched(false);
    setUsedLongdo(false);
    setLookupStatus("idle");
    setLookupError(null);
    setCandidates([]);
    setLookupPos(null);
  }

  function handleBackChange(value: string) {
    // Invalidate an in-flight lookup before accepting hand-entered content.
    lookupSeq.current += 1;
    activeRequest.current = null;
    autoFilledAnswer.current = null;
    backRef.current = value;
    answerWordRef.current = frontRef.current.trim() || null;
    thaiTouchedRef.current = true;
    setBack(value);
    setAnswerWord(answerWordRef.current);
    setAnswerEdited(true);
    setThaiTouched(true);
    setUsedLongdo(false);
    setLookupStatus("idle");
    setLookupError(null);
    setCandidates([]);
    setLookupPos(null);
  }

  function handleCandidateChange(value: string) {
    // Choosing a candidate is an explicit answer decision. Invalidate any
    // older request and keep Longdo provenance for the chosen sense.
    lookupSeq.current += 1;
    activeRequest.current = null;
    autoFilledAnswer.current = null;
    backRef.current = value;
    answerWordRef.current = frontRef.current.trim() || null;
    thaiTouchedRef.current = true;
    setBack(value);
    setAnswerWord(answerWordRef.current);
    setAnswerEdited(false);
    setThaiTouched(true);
    setUsedLongdo(true);
  }

  function closeEditor() {
    resetTranslateState();
    setSheetOpen(false);
    setEditCardId(null);
    setEditingSource(null);
    setEditingBilingual(false);
    setAnswerWord(null);
    setAnswerEdited(false);
    setThaiTouched(false);
    frontRef.current = "";
    backRef.current = "";
    answerWordRef.current = null;
  }

  useEffect(() => () => {
    // React can unmount the page while a request is still unresolved.
    lookupSeq.current += 1;
    activeRequest.current = null;
  }, []);

  function handleSaveCard() {
    if (!front.trim() || !back.trim()) {
      setFormError("Enter both sides before saving.");
      return;
    }
    const wordEng = front.trim();
    const wordThai = back.trim();
    if (!answerMatchesWord(answerWord, wordEng)) {
      setFormError("Confirm the meaning after changing the English word.");
      return;
    }
    const original = editCardId ? cards.find((c) => c.id === editCardId) : undefined;
    const pairSelected = editingBilingual || usedLongdo || Boolean(level);
    const saveSource = resolveSaveSource({
      usedLongdo,
      answerEdited,
      editingBilingual,
      editingSource,
      originalSource: original?.source ?? null,
    });
    const metadata: Partial<Pick<CardType, "level" | "source" | "wordEng" | "wordThai">> = pairSelected
      ? {
          ...(level ? { level } : {}),
          ...(saveSource ? { source: saveSource as CardSource } : {}),
          wordEng,
          wordThai,
        }
      : {};
    try {
      const saved = editCardId
        ? updateCard(editCardId, { front: wordEng, back: wordThai, ...metadata })
        : createCard(id, wordEng, wordThai, metadata);
      if (!saved) {
        setFormError("This term no longer exists. Close the editor and reload the set.");
        return;
      }
      // The store emits flashcards:change synchronously. Re-read the current
      // snapshot after that event so an appended card is never duplicated in
      // local state and concurrent cards stay visible.
      setCards(getCardsByDeck(id));
      setFront(""); setBack(""); setLevel(EMPTY_LEVEL); setEditCardId(null); setEditingSource(null); setEditingBilingual(false); setSheetOpen(false);
      resetTranslateState();
      setAnswerWord(null); setAnswerEdited(false); setThaiTouched(false);
      setFormError(null); setQuery("");
      showToast(editCardId ? "Changes saved" : "Term added");
    } catch {
      setFormError("Could not save. Your text is still here. Check browser storage and try again.");
    }
  }

  function handleEditCard(card: CardType) {
    const normalized = normalizeCard(card);
    setFormError(null);
    setFront(normalized.front);
    setBack(getDisplayBack(normalized));
    setLevel(normalized.level ?? EMPTY_LEVEL);
    setEditingSource(normalized.source ?? null);
    setEditingBilingual(isBilingualCard(card));
    setEditCardId(card.id);
    resetTranslateState();
    setAnswerWord(normalized.front.trim());
    setAnswerEdited(false);
    setThaiTouched(Boolean(getDisplayBack(normalized).trim()));
    frontRef.current = normalized.front;
    backRef.current = getDisplayBack(normalized);
    answerWordRef.current = normalized.front.trim();
    thaiTouchedRef.current = Boolean(getDisplayBack(normalized).trim());
    setSheetOpen(true);
  }

  function handleDeleteCard(cardId: string) {
    try {
      const removed = deleteCard(cardId);
      if (!removed) {
        showToast("This term no longer exists. Reload the set to update the list.");
        return;
      }
      setCards(getCardsByDeck(id));
      showToast("Deleted term", {
        label: "Undo",
        onUndo: () => {
          // Restoration failures must reach ToastHost, which keeps Undo available.
          try {
            restoreCard(removed);
            setCards(getCardsByDeck(id));
          } catch {
            showToast("Could not restore this term. Please reload the set.");
          }
        },
      });
    } catch { showToast("Could not delete this term. Please try again."); }
  }

  function handleOpenAdd() {
    setFormError(null);
    setFront("");
    setBack("");
    setLevel(EMPTY_LEVEL);
    setEditCardId(null);
    setEditingSource(null);
    setEditingBilingual(false);
    setAnswerWord(null);
    setAnswerEdited(false);
    frontRef.current = "";
    backRef.current = "";
    answerWordRef.current = null;
    resetTranslateState();
    setThaiTouched(false);
    setSheetOpen(true);
  }

  const dueCount = cards.filter(isDue).length;
  const canSave = front.trim().length > 0 && back.trim().length > 0;
  const quizDisabled = useMemo(() => !canBuildQuiz(cards), [cards]);

  const search = query.trim().toLocaleLowerCase();
  const cefrCounts = useMemo(() => {
    const counts: Partial<Record<CefrFilterValue, number>> = { All: cards.length };
    for (const lv of CEFR_LEVELS) {
      counts[lv] = cards.filter((c) => normalizeCard(c).level === lv).length;
    }
    return counts;
  }, [cards]);

  const visibleCards = useMemo(() => cards.filter((card) => {
    const normalized = normalizeCard(card);
    if (cefrFilter !== "All" && normalized.level !== cefrFilter) return false;
    if (!search) return true;
    return (
      normalized.front.toLocaleLowerCase().includes(search) ||
      getDisplayBack(normalized).toLocaleLowerCase().includes(search)
    );
  }), [cards, cefrFilter, search]);

  const lookupLoading = lookupStatus === "loading";
  // Displayed provenance derives from the same resolver as the save path (F15).
  const editOriginalSource = editCardId ? (cards.find((c) => c.id === editCardId)?.source ?? null) : null;
  const willSaveAs: CardSource = resolveSaveSource({
    usedLongdo,
    answerEdited,
    editingBilingual,
    editingSource,
    originalSource: editOriginalSource,
  }) ?? "manual";

  if (loading) return <LoadingSkeleton />;
  if (readError || !deck) return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">{readError ? "Unable to load set" : "Set not found"}</h1>
      <p role={readError ? "alert" : undefined}>{readError ?? "This set may have been deleted."}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => loadDeck()}>Try again</Button>
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
          {cards.length > 0 ? (
            <Link href={`/study/${id}`} className={`${styles.mode} ${styles.modePrimary}`}>
              <CardStackIcon /> Flashcards <span className={styles.modeArrow} aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className={styles.mode} role="link" aria-disabled="true" aria-describedby="study-help">
              <CardStackIcon /> Flashcards
            </span>
          )}
          {dueCount === 0 && <p id="study-help" className={styles.modeHelp}>
            {cards.length === 0 ? "Add a term to start studying." : "Nothing due right now. You can still practice this set anytime."}
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
        // Single progress definition shared with library/study (lib/library.ts).
        const { total, learned, remaining, notStarted, learnedPct } = deckProgress(cards);
        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
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

      {cards.length > 0 && <div className="mb-4 space-y-3">
        <div>
          <label htmlFor="term-search" className="block text-sm font-medium text-slate-700">Search terms and definitions</label>
          <div className="mt-1 flex gap-2">
            <input id="term-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a term" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base" />
            {query && <Button variant="secondary" onClick={() => setQuery("")}>Clear</Button>}
          </div>
        </div>
        <CefrFilter value={cefrFilter} onChange={setCefrFilter} counts={cefrCounts} idPrefix="terms-cefr" />
        <p role="status" className="text-sm text-slate-500">Showing {visibleCards.length} of {cards.length} terms</p>
      </div>}
      {cards.length === 0 ? (
        <EmptyState
          title="No terms yet"
          hint="Add your first term to start studying."
          action={<Button size="sm" onClick={handleOpenAdd}><PlusIcon /> Add term</Button>}
        />
      ) : visibleCards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">No matching terms. Try another search or level.</p>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {visibleCards.map((card) => {
            const normalized = normalizeCard(card);
            const thai = getDisplayBack(normalized);
            const bilingual = isBilingualCard(card);
            return (
              <div
                key={card.id}
                className="grid grid-cols-1 gap-3 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-center sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">{bilingual ? "English" : "Front"}</p>
                  <p className="mt-0.5 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] break-words font-medium text-slate-900">{normalized.front}</p>
                  {bilingual && <div className="mt-1.5"><LevelBadge level={normalized.level} /></div>}
                </div>
                <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-6">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">{bilingual ? "Thai · คำแปล" : "Back"}</p>
                  <p className="mt-0.5 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-slate-600">{thai}</p>
                  {bilingual && <div className="mt-1.5"><SourceTag source={normalized.source} /></div>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleEditCard(card)}
                    aria-label={`Edit term: ${normalized.front}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    aria-label={`Delete term: ${normalized.front}`}
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
        onClose={closeEditor}
        title={editCardId ? "Edit term" : "Add term"}
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); handleSaveCard(); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
              event.preventDefault(); event.currentTarget.requestSubmit();
            }
          }}>
          <p className="text-sm text-slate-500">Type English, look up the Thai meaning, then confirm the level. Use Ctrl+Enter or Command+Enter to save.</p>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <div>
            <label htmlFor="card-front" className="mb-1 block text-sm font-medium text-slate-700">
              English word
            </label>
            <textarea
              id="card-front"
              value={front}
              onChange={(e) => handleFrontChange(e.target.value)}
              placeholder="e.g. provide"
              rows={2}
              required
              lang="en"
              autoComplete="off"
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!front.trim() || lookupLoading}
                loading={lookupLoading}
                onClick={() => runLookup(front, false)}
                aria-label={lookupLoading ? "Looking up Thai meaning" : "Look up Thai meaning"}
              >
                {!lookupLoading && <SearchIcon />}
                {lookupLoading ? "Looking up…" : "Lookup Thai"}
              </Button>
              {lookupPos && lookupStatus === "done" && (
                <span className="text-xs text-slate-500">
                  Dictionary tag: <span className="font-semibold text-slate-700">{lookupPos}</span>
                </span>
              )}
            </div>
            {lookupStatus === "error" && lookupError && (
              <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                {lookupError}
              </p>
            )}
            {lookupStatus === "done" && candidates.length > 1 && (
              <div className="mt-2">
                <label htmlFor="candidate-pick" className="mb-1 block text-xs font-medium text-slate-600">
                  {candidates.length} meanings found — the top one is filled in. Pick another if it fits better.
                </label>
                <select
                  id="candidate-pick"
                  value={back}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="field"
                >
                  {candidates.map((c, i) => (
                    <option key={`${c.headword}-${c.thai}-${i}`} value={c.thai}>
                      {c.thai}{c.pos ? ` (${c.pos})` : ""} — {c.headword}{i === 0 ? " · top result" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  The top result follows dictionary order (for example, the verb sense comes first). Choose the noun sense when that is what you want to learn.
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="card-back" className="mb-1 block text-sm font-medium text-slate-700">
              Thai meaning <span className="font-normal text-slate-400">(editable)</span>
            </label>
            <textarea
              id="card-back"
              value={back}
              onChange={(e) => handleBackChange(e.target.value)}
              placeholder="e.g. จัดหาให้"
              rows={2}
              required
              lang="th"
              autoComplete="off"
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#4255FF] focus:outline-none focus:ring-2 focus:ring-[#4255FF]/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="card-level" className="mb-1 block text-sm font-medium text-slate-700">
                CEFR level
              </label>
              <select
                id="card-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as EditorLevel)}
                className="field"
              >
                <option value={EMPTY_LEVEL}>No level</option>
                {CEFR_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Optional for generic cards; choose a level when this is an English–Thai pair.</p>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Source</span>
              <p className="field flex items-center !min-h-[44px] !border-dashed bg-slate-50 text-sm text-slate-600">
                {willSaveAs === "longdo" ? "Longdo lookup" : willSaveAs === "oxford" ? "Oxford seed" : "Hand-typed"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {usedLongdo ? "A lookup was used, so this saves as Longdo." : "No lookup yet — this saves by hand."}
              </p>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!canSave}>
            {editCardId ? "Save Changes" : "Add term"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={closeEditor}>Cancel</Button>
        </form>
      </Sheet>
    </div>
  );
}
