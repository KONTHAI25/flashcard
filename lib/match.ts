import { getDisplayBack, type Card } from "./types";

/**
 * Find the Pair (Quizlet Match) board logic. Pure so the UI can stay thin and
 * the timing/selection rules are regression-tested without a DOM.
 */
export type MatchSide = "en" | "th";

export interface MatchTile {
  id: string;
  pairId: string;
  side: MatchSide;
  text: string;
}

export type MatchKind = "idle" | "selected" | "pair" | "mismatch" | "complete";

export interface MatchState {
  kind: MatchKind;
  selectedIds: string[];
  matchedPairIds: string[];
  mistakes: number;
  /** Last wrong attempt, kept one step so the UI can flash both tiles. */
  mistakeIds: string[];
}

export const MATCH_DEFAULT_PAIRS = 6;
export const MATCH_MAX_PAIRS = 8;
export const MATCH_MIN_PAIRS = 2;

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

interface UsablePair {
  pairId: string;
  front: string;
  back: string;
}

/** Number of unambiguous EN–TH pairs available for a Match board. */
export function countMatchablePairs(cards: readonly Card[]): number {
  return usablePairs(cards).length;
}

function usablePairs(cards: readonly Card[]): UsablePair[] {
  const seenPrompt = new Set<string>();
  const seenAnswer = new Set<string>();
  const pairs: UsablePair[] = [];
  for (const card of cards) {
    const front = card.front.replace(/\s+/g, " ").trim();
    const back = getDisplayBack(card).replace(/\s+/g, " ").trim();
    if (!front || !back) continue;
    const promptKey = normalize(front);
    const answerKey = normalize(back);
    if (seenPrompt.has(promptKey) || seenAnswer.has(answerKey)) continue;
    seenPrompt.add(promptKey);
    seenAnswer.add(answerKey);
    pairs.push({ pairId: card.id, front, back });
  }
  return pairs;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick at most `pairCount` unambiguous pairs and return their shuffled tiles.
 * A deck with fewer than two usable pairs yields an empty board.
 */
export function buildMatchBoard(
  cards: readonly Card[],
  pairCount: number = MATCH_DEFAULT_PAIRS,
  random: () => number = Math.random,
): MatchTile[] {
  const count = Math.min(MATCH_MAX_PAIRS, Math.max(0, Math.floor(pairCount)));
  const chosen = shuffle(usablePairs(cards), random).slice(0, count);
  if (chosen.length < MATCH_MIN_PAIRS) return [];
  const tiles: MatchTile[] = chosen.flatMap(pair => [
    { id: `${pair.pairId}:en`, pairId: pair.pairId, side: "en" as const, text: pair.front },
    { id: `${pair.pairId}:th`, pairId: pair.pairId, side: "th" as const, text: pair.back },
  ]);
  return shuffle(tiles, random);
}

export function initialMatchState(): MatchState {
  return { kind: "idle", selectedIds: [], matchedPairIds: [], mistakes: 0, mistakeIds: [] };
}

/**
 * Advance the board state for one tile click. Unknown/matched/selected tiles
 * are no-ops so rapid taps cannot corrupt the state.
 */
export function selectMatchTile(state: MatchState, tileId: string, board: readonly MatchTile[]): MatchState {
  const tile = board.find(candidate => candidate.id === tileId);
  if (!tile) return state;
  if (state.matchedPairIds.includes(tile.pairId)) return state;
  if (state.selectedIds.includes(tileId)) return state;

  const firstId = state.selectedIds[0];
  if (!firstId) {
    return { ...state, kind: "selected", selectedIds: [tileId], mistakeIds: [] };
  }

  const first = board.find(candidate => candidate.id === firstId);
  if (!first) {
    return { ...initialMatchState(), kind: "selected", selectedIds: [tileId], matchedPairIds: state.matchedPairIds, mistakes: state.mistakes };
  }

  if (first.pairId === tile.pairId && first.id !== tile.id) {
    const matchedPairIds = [...state.matchedPairIds, tile.pairId];
    const boardPairs = new Set(board.map(candidate => candidate.pairId));
    const complete = matchedPairIds.length >= boardPairs.size;
    return {
      kind: complete ? "complete" : "pair",
      selectedIds: [],
      matchedPairIds,
      mistakes: state.mistakes,
      mistakeIds: [],
    };
  }

  return {
    kind: "mismatch",
    selectedIds: [],
    matchedPairIds: state.matchedPairIds,
    mistakes: state.mistakes + 1,
    mistakeIds: [first.id, tile.id],
  };
}

/** 100% means every matched pair was found without a wrong attempt. */
export function matchAccuracy(pairCount: number, mistakes: number): number {
  if (pairCount <= 0) return 100;
  const attempts = pairCount + Math.max(0, mistakes);
  return Math.max(0, Math.round((pairCount / attempts) * 100));
}

/** Compact clock for the match header and summary. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
