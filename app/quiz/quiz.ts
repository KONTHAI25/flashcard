import { getDisplayBack, type Card } from "../../lib/types";

export const MIN_QUIZ_ANSWERS = 4;

/** Plain Thai answer text — strips any legacy " [B1]" suffix stored in `back`. */
export function displayAnswer(card: Pick<Card, "back">): string {
  return getDisplayBack(card);
}

const answerKey = (text: string) => displayAnswer({ back: text }).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function distinctAnswerCount(cards: Card[]): number {
  return new Set(cards.filter(c => c.front.trim() && displayAnswer(c).trim()).map(c => answerKey(displayAnswer(c)))).size;
}

/**
 * Cheap eligibility check mirroring buildQuiz() rules (distinct answers AND
 * per-prompt ambiguity) without shuffling or materializing questions.
 * Use this for buttons/badges; use buildQuiz() for the actual session.
 */
export function canBuildQuiz(cards: Card[]): boolean {
  const usable = cards.filter(c => c.front.trim() && displayAnswer(c).trim());
  const answers = new Map(usable.map(c => [answerKey(displayAnswer(c)), displayAnswer(c)]));
  if (answers.size < MIN_QUIZ_ANSWERS) return false;
  // Group answer keys by normalized prompt to exclude ambiguous alternatives.
  const promptAnswers = new Map<string, Set<string>>();
  for (const c of usable) {
    const prompt = answerKey(c.front);
    let set = promptAnswers.get(prompt);
    if (!set) { set = new Set(); promptAnswers.set(prompt, set); }
    set.add(answerKey(displayAnswer(c)));
  }
  return usable.some(card => {
    const valid = promptAnswers.get(answerKey(card.front)) ?? new Set();
    return answers.size - valid.size >= MIN_QUIZ_ANSWERS - 1;
  });
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
  const usable = cards.filter(c => c.front.trim() && displayAnswer(c).trim());
  const answers = new Map(usable.map(c => [answerKey(displayAnswer(c)), displayAnswer(c)]));
  if (answers.size < MIN_QUIZ_ANSWERS) return [];
  return shuffle(usable, random).map(card => {
    const correct = displayAnswer(card);
    // Other definitions of the same prompt are also valid answers, never distractors.
    const validAnswers = new Set(usable.filter(c => answerKey(c.front) === answerKey(card.front)).map(c => answerKey(displayAnswer(c))));
    const wrong = shuffle([...answers].filter(([key]) => !validAnswers.has(key)), random)
      .slice(0, 3).map(([, text]) => text);
    if (wrong.length < MIN_QUIZ_ANSWERS - 1) return null;
    const options = shuffle([correct, ...wrong], random);
    return { card, options, correctIdx: options.indexOf(correct) };
  }).filter((question): question is Question => question !== null);
}
