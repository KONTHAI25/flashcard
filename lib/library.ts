import type { Card, Deck } from "./types";

export interface DeckSummary {
  deck: Deck;
  total: number;
  due: number;
  reviewed: number;
  learned: number;
}

/** Aggregate a snapshot once instead of scanning storage for every deck. */
export function summarizeDecks(decks: Deck[], cards: Card[], now = Date.now()): DeckSummary[] {
  const summaries = new Map(decks.map((deck) => [deck.id, { deck, total: 0, due: 0, reviewed: 0, learned: 0 }]));
  for (const card of cards) {
    const summary = summaries.get(card.deckId);
    if (!summary) continue;
    summary.total++;
    if (card.due <= now) summary.due++;
    const progress = cardProgress(card);
    if (progress !== "notStarted") summary.reviewed++;
    if (progress === "learned") summary.learned++;
  }
  return [...summaries.values()];
}

/** Bucket cards by deck in one pass, preserving storage order within each deck. */
export function groupCardsByDeck<T extends Pick<Card, "deckId">>(cards: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    const group = groups.get(card.deckId);
    if (group) group.push(card);
    else groups.set(card.deckId, [card]);
  }
  return groups;
}

/** Persistent "still learning" count for a deck summary (reviewed minus learned). */
export function summaryRemaining(summary: Pick<DeckSummary, "reviewed" | "learned">): number {
  return summary.reviewed - summary.learned;
}

/**
 * Single definition of per-card progress. All UI surfaces
 * (library list, deck mastery bar, study index) must derive from this.
 * - learned: last result was Know (streak >= 1).
 * - remaining: attempted but not closed out with Know.
 * - notStarted: never attempted.
 */
export function cardProgress(card: Pick<Card, "streak" | "due" | "createdAt">): "learned" | "remaining" | "notStarted" {
  if (card.streak >= 1) return "learned";
  if (card.due > card.createdAt) return "remaining";
  return "notStarted";
}

export interface DeckProgress {
  total: number;
  learned: number;
  remaining: number;
  notStarted: number;
  learnedPct: number;
}

export function deckProgress(cards: Array<Pick<Card, "streak" | "due" | "createdAt">>): DeckProgress {
  let learned = 0;
  let remaining = 0;
  for (const card of cards) {
    const p = cardProgress(card);
    if (p === "learned") learned++;
    else if (p === "remaining") remaining++;
  }
  const total = cards.length;
  const notStarted = total - learned - remaining;
  return { total, learned, remaining, notStarted, learnedPct: total > 0 ? Math.round((learned / total) * 100) : 0 };
}
