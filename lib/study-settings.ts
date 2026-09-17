import { getDisplayBack, type Card } from "./types";

/** Session-only flashcard preferences. Never persisted, never mutates cards. */
export interface StudySettings {
  shuffle: boolean;
  swap: boolean;
}

export const DEFAULT_STUDY_SETTINGS: StudySettings = { shuffle: false, swap: false };

/** Fisher–Yates over a copy; deterministic when a random source is supplied. */
export function shuffleCards<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffle cards that have not been reviewed in this round. A shuffle must
 * visibly change an eligible queue when at least two distinct cards remain;
 * swapping the first eligible card is the bounded fallback when it stays first.
 */
export function shufflePendingCards<T extends { id: string }>(
  cards: readonly T[],
  currentIndex: number,
  revealed: boolean,
  random: () => number = Math.random,
): T[] {
  const start = Math.min(cards.length, Math.max(0, currentIndex + (revealed ? 1 : 0)));
  const prefix = cards.slice(0, start);
  const pending = shuffleCards(cards.slice(start), random);
  if (pending.length > 1 && pending[0].id === cards[start].id) {
    const differentIndex = pending.findIndex(card => card.id !== cards[start].id);
    if (differentIndex > 0) [pending[0], pending[differentIndex]] = [pending[differentIndex], pending[0]];
  }
  return [...prefix, ...pending];
}

/** Restore only pending cards to their original order after a shuffle toggle. */
export function restorePendingCards<T extends { id: string }>(
  current: readonly T[],
  original: readonly T[],
  currentIndex: number,
  revealed: boolean,
): T[] {
  const split = Math.min(current.length, Math.max(0, currentIndex));
  const reviewed = current.slice(0, split);
  const active = revealed && split < current.length ? [current[split]] : [];
  const order = new Map(original.map((card, index) => [card.id, index]));
  const pending = current.slice(split + active.length)
    .sort((a, b) => (order.get(a.id) ?? original.length) - (order.get(b.id) ?? original.length));
  return [...reviewed, ...active, ...pending];
}

export interface StudyFace {
  prompt: string;
  answer: string;
  promptLabel: "English" | "Thai";
  answerLabel: "English" | "Thai";
}

/**
 * Presentation-only view of a card. English is the default prompt; swap shows
 * Thai first, which is the recall direction many learners need.
 */
export function studyFace(card: Pick<Card, "front" | "back">, swap = false): StudyFace {
  const english = card.front.trim();
  const thai = getDisplayBack(card).trim();
  return swap
    ? { prompt: thai, answer: english, promptLabel: "Thai", answerLabel: "English" }
    : { prompt: english, answer: thai, promptLabel: "English", answerLabel: "Thai" };
}

/** Apply session settings without mutating queue order captured for grading. */
export function applyStudySettings<T extends Pick<Card, "front" | "back">>(
  cards: readonly T[],
  settings: StudySettings,
  random: () => number = Math.random,
): T[] {
  return settings.shuffle ? shuffleCards(cards, random) : [...cards];
}
