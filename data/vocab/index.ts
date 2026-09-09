export { VOCAB_01 } from "./part-01";
export { VOCAB_02 } from "./part-02";
export { VOCAB_03 } from "./part-03";
export { VOCAB_04 } from "./part-04";
export { VOCAB_05 } from "./part-05";
export { VOCAB_06 } from "./part-06";

import { VOCAB_03 } from "./part-03";
import { VOCAB_04 } from "./part-04";
import { VOCAB_05 } from "./part-05";
import { VOCAB_06 } from "./part-06";

// Dataset scope: B1–C2 only.
// part-01 (A1, 500 rows) and part-02 (A2, 500 rows) are intentionally retained
// on disk but EXCLUDED from the seed below. Exact repeated tuples have been
// removed from part-03..06; no C1/C2 rows exist yet.
// The filter below is an allowlist (not a denylist) so future C1/C2 rows pass
// through without code changes.
export type VocabRow = [en: string, th: string, level: string];
export const B1_C2_LEVELS = ["B1", "B2", "C1", "C2"] as const;
export type B1C2Level = (typeof B1_C2_LEVELS)[number];

export function isB1C2Level(level: string): level is B1C2Level {
  return (B1_C2_LEVELS as readonly string[]).includes(level);
}

/** B1–C2 filtered aggregate used only for new installations. */
export const VOCAB_B1_C2: VocabRow[] = [
  ...VOCAB_03,
  ...VOCAB_04,
  ...VOCAB_05,
  ...VOCAB_06,
].filter((row): row is [string, string, B1C2Level] => isB1C2Level(row[2]));
