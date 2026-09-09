import { Deck, Card } from "./types";
import {
  VOCAB_01,
  VOCAB_02,
  VOCAB_03,
  VOCAB_04,
  VOCAB_05,
  VOCAB_06,
} from "../data/vocab";

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


export function buildInitialData(): { decks: Deck[]; cards: Card[] } {
  const now = Date.now();
  const oxford = buildOxfordSeed(now);
  return {
    decks: [{ ...SEED_DECK, createdAt: now }, ...oxford.decks],
    cards: [...SEED_CARDS.map(card => ({ ...card, due: now, createdAt: now })), ...oxford.cards],
  };
}
