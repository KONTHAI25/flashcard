"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Deck } from "@/lib/types";
import { getDeck, getCardsByDeck, updateCard } from "@/lib/store";
import { reviewCard } from "@/lib/srs";
import { Button } from "@/components/Button";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Question {
  card: CardType;
  options: string[];
  correctIdx: number;
}

function shuffleIndices(n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  return shuffle(indices);
}

function buildQuiz(cards: CardType[]): Question[] {
  if (cards.length < 4) return [];
  const shuffled = shuffle(cards);
  return shuffled.map((card) => {
    // Get 3 wrong answers from other cards
    const others = cards.filter((c) => c.id !== card.id);
    const wrongOptions = shuffle(others)
      .slice(0, 3)
      .map((c) => c.back);
    const raw = [card.back, ...wrongOptions];
    // Shuffle via index tracking to avoid indexOf ambiguity
    const order = shuffleIndices(raw.length);
    const options = order.map((i) => raw[i]);
    const correctIdx = order.indexOf(0); // 0 = correct answer slot
    return { card, options, correctIdx };
  });
}

const LETTERS = ["A", "B", "C", "D"];

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={className}
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
    </svg>
  );
}

function XCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

function BackArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function resultMessage(pct: number): string {
  if (pct >= 80) return "Excellent work!";
  if (pct >= 50) return "Good effort — keep going!";
  return "Keep practicing — you'll get it!";
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const d = getDeck(id);
    if (!d) { router.push("/"); return; }
    setDeck(d);
    const allCards = getCardsByDeck(id);
    setQuestions(buildQuiz(allCards));
  }, [id, router]);

  function handleSelect(idx: number) {
    if (selected !== null) return; // already answered
    setSelected(idx);
    const q = questions[currentIdx];
    const correct = idx === q.correctIdx;
    if (correct) setScore((s) => s + 1);

    // Update SRS
    const quality = correct ? 2 : 0;
    const updated = reviewCard(q.card, quality);
    updateCard(q.card.id, updated);
  }

  function handleNext() {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    }
  }

  function resetQuiz() {
    setCurrentIdx(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setQuestions(buildQuiz(getCardsByDeck(id)));
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (finished || questions.length === 0) return;
      const answered = selected !== null;
      if (!answered) {
        const key = e.key.toLowerCase();
        let idx = -1;
        if (key >= "1" && key <= "4") idx = Number(key) - 1;
        else if (key >= "a" && key <= "d") idx = key.charCodeAt(0) - 97;
        if (idx >= 0 && idx < questions[currentIdx].options.length) {
          e.preventDefault();
          handleSelect(idx);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, selected, currentIdx, questions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!deck) return <p className="text-slate-500">Loading…</p>;

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-slate-900">Not enough terms</h1>
        <p className="mb-4 text-sm text-slate-500">You need at least 4 terms to start a quiz.</p>
        <Button onClick={() => router.push(`/deck/${id}`)}>Back to set</Button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <div
            role="status"
            aria-label={`Quiz complete. Scored ${score} out of ${questions.length}, ${pct} percent.`}
            className="grid h-36 w-36 place-items-center rounded-full border-4 border-[#4255FF] bg-white"
          >
            <div>
              <p className="text-4xl font-bold text-slate-900">{pct}%</p>
              <p className="mt-1 text-xs text-slate-500">
                {score}/{questions.length} correct
              </p>
            </div>
          </div>
          <h1 className="mb-1 mt-6 text-2xl font-bold text-slate-900">Quiz Complete!</h1>
          <p className="text-sm text-slate-500">{resultMessage(pct)}</p>
          <dl className="mt-6 flex items-center gap-8 text-center">
            <div>
              <dt className="text-xs text-slate-500">Correct</dt>
              <dd className="text-lg font-bold text-emerald-700">{score}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Total</dt>
              <dd className="text-lg font-bold text-slate-900">{questions.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Accuracy</dt>
              <dd className="text-lg font-bold text-slate-900">{pct}%</dd>
            </div>
          </dl>
          <div className="mt-8 flex w-full max-w-xs gap-3">
            <Button variant="secondary" onClick={() => router.push(`/deck/${id}`)} className="flex-1">
              Back
            </Button>
            <Button onClick={resetQuiz} className="flex-1">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isCorrect = selected === q.correctIdx;
  const answered = selected !== null;
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <BackArrowIcon />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-slate-900">Quiz · {deck.name}</h1>
        <span
          role="status"
          aria-label={`Current score ${score}`}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
        >
          Score {score}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <p className="text-slate-500">
          Question {currentIdx + 1} of {questions.length}
        </p>
      </div>

      {/* Progress */}
      <div
        role="progressbar"
        aria-valuenow={currentIdx + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${currentIdx + 1} of ${questions.length}`}
        className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-[#4255FF] transition-all"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6 grid min-h-[140px] place-items-center rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-center text-lg leading-relaxed text-slate-900">{q.card.front}</p>
      </div>

      {/* Options */}
      <div role="radiogroup" aria-label={`Answer choices for question ${currentIdx + 1}`} className="space-y-3">
        {q.options.map((opt, idx) => {
          const isThisCorrect = idx === q.correctIdx;
          const isThisSelected = idx === selected;
          let cls =
            "flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white ";
          let letterCls =
            "grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-bold ";
          let icon = null;

          if (!answered) {
            cls += "border-slate-200 text-slate-900 hover:border-[#4255FF] active:scale-[0.99]";
            letterCls += "bg-slate-100 text-slate-500";
          } else if (isThisCorrect) {
            cls += "border-emerald-500 bg-emerald-50 text-emerald-800";
            letterCls += "bg-emerald-100 text-emerald-800";
            icon = <CheckIcon className="h-5 w-5 shrink-0 text-emerald-600" />;
          } else if (isThisSelected) {
            cls += "border-rose-500 bg-rose-50 text-rose-800";
            letterCls += "bg-rose-100 text-rose-800";
            icon = <XIcon className="h-5 w-5 shrink-0 text-rose-500" />;
          } else {
            cls += "border-slate-200 text-slate-500 opacity-50";
            letterCls += "bg-slate-100 text-slate-400";
          }

          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isThisSelected}
              aria-disabled={answered}
              disabled={answered}
              onClick={() => handleSelect(idx)}
              className={cls}
            >
              <span aria-hidden="true" className={letterCls}>
                {LETTERS[idx]}
              </span>
              <span className="flex-1">{opt}</span>
              {icon}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Press {LETTERS.slice(0, q.options.length).join("/")} or 1–{q.options.length} to answer
      </p>

      {answered && (
        <div className="sticky bottom-0 mt-6 flex flex-col items-center gap-3 border-t border-slate-200/70 bg-white/85 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p
            role="status"
            className={`flex items-center gap-2 font-semibold ${isCorrect ? "text-emerald-700" : "text-rose-600"}`}
          >
            {isCorrect ? (
              <>
                <CheckCircleIcon />
                Correct!
              </>
            ) : (
              <>
                <XCircleIcon />
                <span>The answer was: {q.options[q.correctIdx]}</span>
              </>
            )}
          </p>
          <Button onClick={handleNext} className="w-full">
            {isLast ? "See results" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
