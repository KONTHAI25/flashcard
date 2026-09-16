import { getDisplayBack, type Card } from "./types";

/** Session-only flashcard preferences. Never persisted, never mutates cards. */
export interface StudySettings {
  shuffle: boolean;
  swap: boolean;
}

export const DEFAULT_STUDY_SETTINGS: StudySettings = { shuffle: false, swap: false };

/** Fisher–Yates over a copy; deterministic when a random source is supplied. */
export function shuffleCards<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface StudyFace {
  prompt: string;
  answer: string;
  promptLabel: "English" | "Thai";
  answerLabel: "English" | "Thai";
}

/**
 * Presentation-only view of a card. English is the default prompt; swap shows
 * Thai first, which is the recall direction many learners need.
 */
export function studyFace(card: Pick<Card, "front" | "back">, swap = false): StudyFace {
  const english = card.front.trim();
  const thai = getDisplayBack(card).trim();
  return swap
    ? { prompt: thai, answer: english, promptLabel: "Thai", answerLabel: "English" }
    : { prompt: english, answer: thai, promptLabel: "English", answerLabel: "Thai" };
}

/** Apply session settings without mutating queue order captured for grading. */
export function applyStudySettings<T extends Pick<Card, "front" | "back">>(
  cards: readonly T[],
  settings: StudySettings,
  random: () => number = Math.random,
): T[] {
  return settings.shuffle ? shuffleCards(cards, random) : [...cards];
}
