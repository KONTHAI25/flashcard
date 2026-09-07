"use client";

import { Deck, Card } from "./types";
import {
  VOCAB_01,
  VOCAB_02,
  VOCAB_03,
  VOCAB_04,
  VOCAB_05,
  VOCAB_06,
} from "../data/vocab";

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

// ── Oxford 3000 decks (60 decks × 50 cards) ──

const OXFORD_LEGACY_DECK_ID = "deck-oxford-3000";
const OXFORD_CHUNK_SIZE = 50;
const OXFORD_PREFIX = "deck-oxford-";

function oxfordDeckId(n: number): string {
  return `${OXFORD_PREFIX}${String(n).padStart(2, "0")}`;
}

function buildOxfordSeed(now: number): { decks: Deck[]; cards: Card[] } {
  const all: Array<[string, string, string]> = [
    ...VOCAB_01,
    ...VOCAB_02,
    ...VOCAB_03,
    ...VOCAB_04,
    ...VOCAB_05,
    ...VOCAB_06,
  ];
  const decks: Deck[] = [];
  const cards: Card[] = [];
  const totalDecks = Math.ceil(all.length / OXFORD_CHUNK_SIZE);
  for (let d = 0; d < totalDecks; d++) {
    const deckId = oxfordDeckId(d + 1);
    const start = d * OXFORD_CHUNK_SIZE + 1;
    const end = Math.min((d + 1) * OXFORD_CHUNK_SIZE, all.length);
    decks.push({
      id: deckId,
      name: `Oxford ${String(d + 1).padStart(2, "0")} · ${start}–${end}`,
      emoji: "📚",
      createdAt: now,
    });
    all
      .slice(d * OXFORD_CHUNK_SIZE, (d + 1) * OXFORD_CHUNK_SIZE)
      .forEach(([en, th, level], i) => {
        cards.push({
          id: `${deckId}-c${i + 1}`,
          deckId,
          front: en,
          // Card has no `level` field, so keep CEFR level as a back suffix.
          back: `${th} [${level}]`,
          interval: 1,
          ease: 2.5,
          due: now,
          streak: 0,
          createdAt: now,
        });
      });
  }
  return { decks, cards };
}

// Merge-style seed: adds the 60 Oxford decks once, never overwrites.
// Idempotent: skips if all 60 decks (with all 3000 cards) already exist.
// Migration: removes the legacy single "deck-oxford-3000" deck + `ox-<n>`
// cards from the previous seed scheme, then seeds the 60 × 50 layout.
// Quota-guarded: writeJSON drops + warns on QuotaExceededError.
function seedOxfordIfNeeded() {
  if (typeof window === "undefined") return;
  try {
    let decks = readJSON<Deck[]>(DECKS_KEY, []);
    let cards = readJSON<Card[]>(CARDS_KEY, []);
    let changed = false;

    // Drop legacy single-deck data (old scheme).
    if (decks.some((d) => d.id === OXFORD_LEGACY_DECK_ID)) {
      decks = decks.filter((d) => d.id !== OXFORD_LEGACY_DECK_ID);
      changed = true;
    }
    if (cards.some((c) => c.deckId === OXFORD_LEGACY_DECK_ID || /^ox-\d+$/.test(c.id))) {
      cards = cards.filter(
        (c) => c.deckId !== OXFORD_LEGACY_DECK_ID && !/^ox-\d+$/.test(c.id)
      );
      changed = true;
    }

    const { decks: oxDecks, cards: oxCards } = buildOxfordSeed(0);
    const haveAllDecks = oxDecks.every((d) => decks.some((x) => x.id === d.id));
    const haveAllCards =
      cards.filter((c) => c.deckId.startsWith(OXFORD_PREFIX)).length ===
      oxCards.length;
    if (haveAllDecks && haveAllCards) {
      if (changed) {
        writeJSON(DECKS_KEY, decks);
        writeJSON(CARDS_KEY, cards);
      }
      return;
    }

    // Remove partial Oxford data before (re)seeding to avoid duplicates.
    decks = decks.filter((d) => !d.id.startsWith(OXFORD_PREFIX));
    cards = cards.filter((c) => !c.deckId.startsWith(OXFORD_PREFIX));

    const now = Date.now();
    const fresh = buildOxfordSeed(now);
    writeJSON(DECKS_KEY, [...decks, ...fresh.decks]);
    writeJSON(CARDS_KEY, [...cards, ...fresh.cards]);
  } catch {
    // Never break existing deck/card flows if the Oxford merge fails.
  }
}

// ── Decks ──

export function getDecks(): Deck[] {
  seedIfNeeded();
  seedOxfordIfNeeded();
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
  seedOxfordIfNeeded();
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
