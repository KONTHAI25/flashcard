"use client";

import { useState, useEffect, use } from "react";
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

  if (!deck) return <p className="text-slate-500">Loading…</p>;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center">
        <p className="text-3xl mb-3">📝</p>
        <h1 className="text-xl font-bold mb-2">Not enough cards</h1>
        <p className="text-slate-400 mb-4">You need at least 4 cards to start a quiz.</p>
        <Button onClick={() => router.push(`/deck/${id}`)}>Back to Deck</Button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center">
        <p className="text-5xl mb-4">
          {pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}
        </p>
        <h1 className="text-2xl font-bold mb-2">Quiz Complete!</h1>
        <p className="text-slate-400 mb-1">
          {score}/{questions.length} correct ({pct}%)
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push(`/deck/${id}`)}>
            Back
          </Button>
          <Button
            onClick={() => {
              setCurrentIdx(0);
              setSelected(null);
              setScore(0);
              setFinished(false);
              setQuestions(buildQuiz(getCardsByDeck(id)));
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isCorrect = selected === q.correctIdx;
  const answered = selected !== null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-slate-400 hover:text-white">
          ←
        </button>
        <h1 className="text-xl font-bold">Quiz: {deck.name}</h1>
      </div>

      <p className="mb-2 text-center text-sm text-slate-400">
        Question {currentIdx + 1} of {questions.length}
      </p>

      {/* Progress */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <p className="text-center text-lg font-medium">{q.card.front}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((opt, idx) => {
          let cls =
            "w-full rounded-xl border p-4 text-left text-sm font-medium transition-all ";
          if (!answered) {
            cls += "border-slate-700 bg-slate-800 hover:border-blue-500 active:scale-[0.98]";
          } else if (idx === q.correctIdx) {
            cls += "border-green-500 bg-green-900/30 text-green-300";
          } else if (idx === selected) {
            cls += "border-red-500 bg-red-900/30 text-red-300";
          } else {
            cls += "border-slate-700 bg-slate-800/50 opacity-50";
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className={isCorrect ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
            {isCorrect ? "✅ Correct!" : `❌ The answer was: ${q.options[q.correctIdx]}`}
          </p>
          <Button onClick={handleNext} className="w-full">
            {currentIdx + 1 >= questions.length ? "See Results" : "Next Question"}
          </Button>
        </div>
      )}
    </div>
  );
}
