export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];
export type CardSource = "oxford" | "longdo" | "manual";

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  interval: number; // days
  ease: number; // SM-2 ease factor
  due: number; // timestamp ms
  streak: number;
  createdAt: number;
  /** All CEFR levels are retained for legacy cards; fresh seeds use B1–C2. */
  level?: CEFRLevel;
  /** Provenance of this pair. Optional for backward compat. */
  source?: CardSource;
  /** Optional explicit aliases; by convention front = wordEng, back = wordThai. */
  wordEng?: string;
  wordThai?: string;
}

/**
 * Levels included in the B1–C2 dataset. Future-proof: C1/C2 rows do not
 * exist yet in data/vocab (only A1/A2/B1/B2) but pass through when added.
 */
export const B1_C2_LEVELS: readonly CEFRLevel[] = ["B1", "B2", "C1", "C2"];

export function isCEFRLevel(value: unknown): value is CEFRLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value);
}

/** Legacy seed wrote back as `${thai} [${level}]` because Card had no level field. */
const LEGACY_LEVEL_SUFFIX = /\s*\[(A1|A2|B1|B2|C1|C2)\]\s*$/;

/**
 * Backward compat: split a legacy `back` suffix (`"คำแปล [B1]"`) into
 * `{ text, level }`. New cards store plain Thai in `back` + `level` field.
 */
export function parseLegacyBack(back: string): { text: string; level?: CEFRLevel } {
  const match = LEGACY_LEVEL_SUFFIX.exec(back);
  if (match && isCEFRLevel(match[1])) {
    return { text: back.slice(0, match.index).trimEnd(), level: match[1] };
  }
  return { text: back };
}

/**
 * Migrate an old card on read: if `level` is missing but `back` carries a
 * `[B1]`-style suffix, return a copy with structured `level` + clean `back`.
 * New cards pass through (fresh copy only when migration applies).
 */
export function normalizeCard<T extends Card>(card: T): T {
  const { text, level } = parseLegacyBack(card.back);
  if (!level) return card;
  return { ...card, back: text, level: card.level ?? level };
}

/** Generic cards stay neutral unless their content has an explicit pair marker. */
export function isBilingualCard(card: Pick<Card, "back" | "level" | "source" | "wordEng" | "wordThai">): boolean {
  return card.source === "oxford" || card.source === "longdo" ||
    Boolean(card.wordEng?.trim() && card.wordThai?.trim()) ||
    parseLegacyBack(card.back).level !== undefined;
}

/** Display helper: plain Thai text without any legacy `[LEVEL]` suffix. */
export function getDisplayBack(card: Pick<Card, "back">): string {
  return parseLegacyBack(card.back).text;
}

export interface Deck {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}
