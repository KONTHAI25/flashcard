import { normalizeCard, type Card, type CEFRLevel } from "./types";

export type StudyMode = "continue" | "learning" | "all" | "due";

/** Apply the active scope before queue fallback and again when replaying cards. */
export function filterStudyCards(cards: Card[], scope: {
  deckIds: ReadonlySet<string>;
  deckId?: string;
  level: CEFRLevel | "All";
  cardIds?: ReadonlySet<string>;
}): Card[] {
  return cards.filter(card => scope.deckIds.has(card.deckId) &&
    (!scope.deckId || card.deckId === scope.deckId) &&
    (scope.level === "All" || normalizeCard(card).level === scope.level) &&
    (!scope.cardIds || scope.cardIds.has(card.id)));
}

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
