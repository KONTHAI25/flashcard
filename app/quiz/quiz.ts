import type { Card } from "../../lib/types";

export const MIN_QUIZ_ANSWERS = 4;
const answerKey = (text: string) => text.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function distinctAnswerCount(cards: Card[]): number {
  return new Set(cards.filter(c => c.front.trim() && c.back.trim()).map(c => answerKey(c.back))).size;
}

export interface Question {
  card: Card;
  options: string[];
  correctIdx: number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildQuiz(cards: Card[], random = Math.random): Question[] {
  const usable = cards.filter(c => c.front.trim() && c.back.trim());
  const answers = new Map(usable.map(c => [answerKey(c.back), c.back]));
  if (answers.size < MIN_QUIZ_ANSWERS) return [];
  return shuffle(usable, random).map(card => {
    // Other definitions of the same prompt are also valid answers, never distractors.
    const validAnswers = new Set(usable.filter(c => answerKey(c.front) === answerKey(card.front)).map(c => answerKey(c.back)));
    const wrong = shuffle([...answers].filter(([key]) => !validAnswers.has(key)), random)
      .slice(0, 3).map(([, text]) => text);
    if (wrong.length < MIN_QUIZ_ANSWERS - 1) return null;
    const options = shuffle([card.back, ...wrong], random);
    return { card, options, correctIdx: options.indexOf(card.back) };
  }).filter((question): question is Question => question !== null);
}
