import type { Card } from "./types";

export type StudyMode = "continue" | "learning" | "all" | "due";

export function isStillLearning(card: Card): boolean {
  return card.streak === 0 && card.due > card.createdAt;
}

/** Review dates schedule reminders; they do not prevent voluntary practice. */
export function selectStudyCards(cards: Card[], mode: StudyMode, now = Date.now()): Card[] {
  if (mode === "all") return [...cards];
  if (mode === "learning") return cards.filter(isStillLearning);
  if (mode === "due") return cards.filter(card => card.due <= now);
  const pending = cards.filter(card => card.due <= now || isStillLearning(card));
  return pending.length ? pending : [...cards];
}
