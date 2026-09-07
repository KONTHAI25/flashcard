"use client";

import { Deck, Card } from "./types";

const DECKS_KEY = "fc_decks";
const CARDS_KEY = "fc_cards";

// ── helpers ──

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError — localStorage full, silently drop write
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn(`[store] QuotaExceeded writing key "${key}" — data not persisted`);
    } else {
      throw e;
    }
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── seed ──

const SEED_DECK: Deck = {
  id: "deck-demo",
  name: "Demo Deck",
  emoji: "🎯",
  createdAt: Date.now(),
};

const SEED_CARDS: Card[] = [
  {
    id: "c1",
    deckId: "deck-demo",
    front: "What is the capital of France?",
    back: "Paris",
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    streak: 0,
    createdAt: Date.now(),
  },
  {
    id: "c2",
    deckId: "deck-demo",
    front: "2 + 2 = ?",
    back: "4",
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    streak: 0,
    createdAt: Date.now(),
  },
  {
    id: "c3",
    deckId: "deck-demo",
    front: "What color is the sky?",
    back: "Blue",
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    streak: 0,
    createdAt: Date.now(),
  },
  {
    id: "c4",
    deckId: "deck-demo",
    front: "Who wrote Hamlet?",
    back: "William Shakespeare",
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    streak: 0,
    createdAt: Date.now(),
  },
];

function seedIfNeeded() {
  if (typeof window === "undefined") return;
  // Only seed if both keys are absent — never overwrite existing data
  const decksExist = localStorage.getItem(DECKS_KEY) !== null;
  const cardsExist = localStorage.getItem(CARDS_KEY) !== null;
  if (!decksExist && !cardsExist) {
    writeJSON(DECKS_KEY, [SEED_DECK]);
    writeJSON(CARDS_KEY, SEED_CARDS);
  }
}

// ── Decks ──

export function getDecks(): Deck[] {
  seedIfNeeded();
  return readJSON<Deck[]>(DECKS_KEY, []);
}

export function getDeck(id: string): Deck | undefined {
  return getDecks().find((d) => d.id === id);
}

export function createDeck(name: string, emoji: string): Deck {
  const decks = getDecks();
  const deck: Deck = { id: uid(), name, emoji, createdAt: Date.now() };
  decks.push(deck);
  writeJSON(DECKS_KEY, decks);
  return deck;
}

export function updateDeck(id: string, patch: Partial<Deck>): Deck | null {
  const decks = getDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  decks[idx] = { ...decks[idx], ...patch };
  writeJSON(DECKS_KEY, decks);
  return decks[idx];
}

export function deleteDeck(id: string): void {
  writeJSON(
    DECKS_KEY,
    getDecks().filter((d) => d.id !== id)
  );
  writeJSON(
    CARDS_KEY,
    getCards().filter((c) => c.deckId !== id)
  );
}

// ── Cards ──

export function getCards(): Card[] {
  seedIfNeeded();
  return readJSON<Card[]>(CARDS_KEY, []);
}

export function getCardsByDeck(deckId: string): Card[] {
  return getCards().filter((c) => c.deckId === deckId);
}

export function getCard(id: string): Card | undefined {
  return getCards().find((c) => c.id === id);
}

export function createCard(
  deckId: string,
  front: string,
  back: string
): Card {
  const cards = getCards();
  const card: Card = {
    id: uid(),
    deckId,
    front,
    back,
    interval: 1,
    ease: 2.5,
    due: Date.now(),
    streak: 0,
    createdAt: Date.now(),
  };
  cards.push(card);
  writeJSON(CARDS_KEY, cards);
  return card;
}

export function updateCard(id: string, patch: Partial<Card>): Card | null {
  const cards = getCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  cards[idx] = { ...cards[idx], ...patch };
  writeJSON(CARDS_KEY, cards);
  return cards[idx];
}

export function deleteCard(id: string): void {
  writeJSON(
    CARDS_KEY,
    getCards().filter((c) => c.id !== id)
  );
}
