"use client";

import { Deck, Card, type CEFRLevel, type CardSource } from "./types";
import { changeStorage, readStorage, StorageError, validateCard, validateCardExtras, validateDeck, validatePatch } from "./storage";
import { reviewCard } from "./srs";
export { StorageError } from "./storage";
export type { StorageErrorCode } from "./storage";

function uid(): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (typeof uuid === "string" && uuid) return uuid;
  } catch {
    // crypto.randomUUID throws on non-secure origins (e.g. http://LAN-IP).
  }
  // Fallback: timestamp + random, sufficient for local-only IDs.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getDecks(): Deck[] { return readStorage().decks; }
export function getDeck(id: string): Deck | undefined { return getDecks().find(deck => deck.id === id); }
export function getCards(): Card[] { return readStorage().cards; }
export function getCardsByDeck(deckId: string): Card[] { return getCards().filter(card => card.deckId === deckId); }
export function getCard(id: string): Card | undefined { return getCards().find(card => card.id === id); }

export function createDeck(name: string, emoji: string): Deck {
  const deck: Deck = { id: uid(), name, emoji, createdAt: Date.now() };
  validateDeck(deck);
  return changeStorage(data => { data.decks.push(deck); return deck; });
}

export function updateDeck(id: string, patch: Partial<Deck>): Deck | null {
  validatePatch(patch, id, ["id", "name", "emoji", "createdAt"]);
  return changeStorage(data => {
    const index = data.decks.findIndex(deck => deck.id === id);
    if (index < 0) return null;
    const deck = { ...data.decks[index], ...patch };
    validateDeck(deck);
    data.decks[index] = deck;
    return deck;
  });
}

export function deleteDeck(id: string): { deck: Deck | null; cards: Card[] } {
  return changeStorage(data => {
    const deck = data.decks.find(deck => deck.id === id) ?? null;
    const cards = data.cards.filter(card => card.deckId === id);
    data.decks = data.decks.filter(deck => deck.id !== id);
    data.cards = data.cards.filter(card => card.deckId !== id);
    return { deck, cards };
  });
}

export function restoreDeck(deck: Deck, cards: Card[]): void {
  validateDeck(deck);
  if (!Array.isArray(cards)) throw new StorageError("invalid-data", "Expected cards array.");
  for (const card of cards) {
    validateCard(card);
    if (card.deckId !== deck.id) throw new StorageError("invalid-data", "Restored cards must belong to the restored deck.");
  }
  changeStorage(data => {
    if (!data.decks.some(existing => existing.id === deck.id)) data.decks.push({ ...deck });
    const ids = new Set(data.cards.map(card => card.id));
    for (const card of cards) {
      if (!ids.has(card.id)) { data.cards.push({ ...card }); ids.add(card.id); }
    }
  });
}

export type NewCardExtras = Partial<Pick<Card, "level" | "source" | "wordEng" | "wordThai">>;

const CARD_PATCH_FIELDS = ["id", "deckId", "front", "back", "interval", "ease", "due", "streak", "createdAt", "level", "source", "wordEng", "wordThai"] as const;

function validateExtras(extras: NewCardExtras | undefined): void {
  if (extras !== undefined) validateCardExtras(extras);
}

export function createCard(deckId: string, front: string, back: string, extras?: NewCardExtras): Card {
  validateExtras(extras);
  const now = Date.now();
  const card: Card = {
    id: uid(),
    deckId,
    front,
    back,
    interval: 1,
    ease: 2.5,
    due: now,
    streak: 0,
    createdAt: now,
    ...(extras?.level ? { level: extras.level as CEFRLevel } : {}),
    ...(extras?.source ? { source: extras.source as CardSource } : {}),
    ...(extras?.wordEng ? { wordEng: extras.wordEng } : {}),
    ...(extras?.wordThai ? { wordThai: extras.wordThai } : {}),
  };
  validateCard(card);
  return changeStorage(data => { data.cards.push(card); return card; });
}

export function updateCard(id: string, patch: Partial<Card>): Card | null {
  validatePatch(patch, id, CARD_PATCH_FIELDS);
  validateExtras(patch);
  return changeStorage(data => {
    const index = data.cards.findIndex(card => card.id === id);
    if (index < 0) return null;
    const current = data.cards[index];
    // Keep bilingual aliases in sync with front/back (F18). An explicit
    // wordEng/wordThai in the patch wins; otherwise a front/back edit carries
    // the existing alias along so they cannot silently drift apart.
    const synced: Partial<Card> = { ...patch };
    if (patch.front !== undefined && patch.wordEng === undefined && current.wordEng !== undefined) {
      synced.wordEng = patch.front;
    }
    if (patch.back !== undefined && patch.wordThai === undefined && current.wordThai !== undefined) {
      synced.wordThai = patch.back;
    }
    const card = { ...current, ...synced };
    validateCard(card);
    data.cards[index] = card;
    return card;
  });
}

/**
 * Computes the schedule from the latest stored card in one synchronous
 * read/modify/write. Independent tabs still use last-writer-wins storage.
 */
export function updateCardReview(id: string, quality: number): Card | null {
  return changeStorage(data => {
    const index = data.cards.findIndex(card => card.id === id);
    if (index < 0) return null;
    const next = reviewCard(data.cards[index], quality);
    validateCard(next);
    data.cards[index] = next;
    return next;
  });
}

export function deleteCard(id: string): Card | null {
  return changeStorage(data => {
    const card = data.cards.find(card => card.id === id) ?? null;
    data.cards = data.cards.filter(card => card.id !== id);
    return card;
  });
}

export function restoreCard(card: Card): void {
  validateCard(card);
  changeStorage(data => {
    if (!data.cards.some(existing => existing.id === card.id)) data.cards.push({ ...card });
  });
}
