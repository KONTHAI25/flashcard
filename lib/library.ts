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
    if (card.streak > 0 || card.due > card.createdAt) summary.reviewed++;
    if (card.streak > 0) summary.learned++;
  }
  return [...summaries.values()];
}
