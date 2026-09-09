"use client";

import { Deck, Card } from "./types";
import { changeStorage, readStorage, StorageError, validateCard, validateDeck, validatePatch } from "./storage";
export { StorageError } from "./storage";
export type { StorageErrorCode } from "./storage";

function uid(): string {
  return globalThis.crypto.randomUUID();
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

export function createCard(deckId: string, front: string, back: string): Card {
  const now = Date.now();
  const card: Card = { id: uid(), deckId, front, back, interval: 1, ease: 2.5, due: now, streak: 0, createdAt: now };
  validateCard(card);
  return changeStorage(data => { data.cards.push(card); return card; });
}

export function updateCard(id: string, patch: Partial<Card>): Card | null {
  validatePatch(patch, id, ["id", "deckId", "front", "back", "interval", "ease", "due", "streak", "createdAt"]);
  return changeStorage(data => {
    const index = data.cards.findIndex(card => card.id === id);
    if (index < 0) return null;
    const card = { ...data.cards[index], ...patch };
    validateCard(card);
    data.cards[index] = card;
    return card;
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
