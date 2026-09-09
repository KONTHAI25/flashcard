/**
 * Small, framework-free guards for the deck editor's asynchronous lookup.
 * A request is valid only while its generation and exact trimmed word still
 * match the editor.  The page owns the mutable state; these functions keep
 * the race-sensitive decisions easy to exercise without a browser.
 */

export interface LookupRequest {
  generation: number;
  word: string;
}

export function beginLookup(previousGeneration: number, word: string): LookupRequest {
  return { generation: previousGeneration + 1, word: word.trim() };
}

export function isLookupCurrent(
  request: LookupRequest,
  currentGeneration: number,
  currentWord: string,
  editorOpen = true,
): boolean {
  return editorOpen && request.generation === currentGeneration && request.word === currentWord.trim();
}

/**
 * An answer can be saved only when it was entered or accepted for this exact
 * front value. This prevents an answer from a prior word surviving a failed
 * replacement lookup.
 */
export function answerMatchesWord(answerWord: string | null, currentWord: string): boolean {
  return Boolean(answerWord && answerWord === currentWord.trim());
}

/**
 * Automatic results may replace only an unprotected answer. Explicit lookup
 * is a user request and may replace a protected answer after its own request
 * passes the generation/word guard.
 */
export function canAutoReplaceAnswer(
  answerTouched: boolean,
  answerWord: string | null,
  currentWord: string,
  answer: string,
): boolean {
  return !answerTouched || !answer.trim() || !answerMatchesWord(answerWord, currentWord);
}

export type SaveSourceInput = {
  usedLongdo: boolean;
  answerEdited: boolean;
  editingBilingual: boolean;
  editingSource: import("./types").CardSource | null;
  originalSource?: import("./types").CardSource | null;
};

/**
 * Single source of truth for card provenance (F15). The editor display
 * (`willSaveAs`) and the persisted `source` must derive from this function
 * so they can never disagree.
 */
export function resolveSaveSource(input: SaveSourceInput): import("./types").CardSource | undefined {
  if (input.usedLongdo) return "longdo";
  if (input.answerEdited || !input.editingBilingual) return "manual";
  return input.originalSource ?? input.editingSource ?? undefined;
}
