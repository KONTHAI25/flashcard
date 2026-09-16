# Agent workstreams — Quizlet UI + complete C1/C2 pairs

Date: 2026-09-16
Base: `b22ebe1` (main) + housekeeping commit `02e22bc`

This environment exposes no subagent tool, so the two requested tasks were run
as isolated tracks with their own branch, tests, and acceptance checks, then
integrated on `main` with `--no-ff` merges:

- `agent/ui-quizlet` → merge commit `a73b957`
- `agent/c1c2-pairs` → merge commit `64b2d97`

## Track 1 — UI/UX closer to Quizlet

TDD contracts first (`tests/match.test.cjs`, `tests/study-settings.test.cjs`),
then implementation:

- `lib/match.ts`: pure Find-the-Pair board, selection, mistake counting,
  accuracy and elapsed-time helpers.
- `lib/study-settings.ts`: pure shuffle / English↔Thai swap presentation;
  session toggles never mutate saved cards or schedules.
- Set cards now use a Quizlet-style coloured cover, large emoji and term count.
- Deck page gained a third study mode card: **Find the pair**, alongside
  Flashcards and Practice quiz.
- Study sessions gained a Quizlet-style toolbar (Shuffle, Swap) and the round
  summary shows known / still learning / accuracy / time.
- New routes: `/match` deck picker and `/match/[id]` timed board with matched,
  selected, mistake and completion states; keyboard/screen-reader labels and
  reduced-motion support.
- Verified in headless Chrome against the production build and via `next build`.

## Track 2 — complete the remaining C1/C2 Thai–English pairs

The committed `part-07` only had A–C slices (127 C1, 146 C2 and 7 mislabeled
B1/B2 rows). The completion contract (`tests/vocab-c1c2.test.cjs`) required:

- every headword in the committed C1/C2 source lists has a pair somewhere in
  the vocabulary;
- `part-07` is C1/C2 only, with unique normalized English headwords and real
  Thai script (no IPA stubs, dictionary tags or slang leftovers);
- `part-08` preserves the seven verified B1/B2 corrections;
- minimum completed counts (≥1100 C1, ≥950 C2).

Sources and generation:

- C1: The Oxford 5000 by CEFR level, C1 section (Oxford University Press).
- C2: Octanove Vocabulary Profile C1/C2 v1.0 (CC BY-SA 4.0, Octanove Labs /
  CEFR-J, via Open Language Profiles).
- Thai meanings: Longdo (NECTEC Lexitron EN–TH) with MyMemory fallback; 141
  manually reviewed entries live in
  `data/vocab/sources/translation-overrides.json`.
- `scripts/build-c1c2-pairs.cjs` is resumable (cache in
  `/tmp/flashcard-c1c2-cache.json`), idempotent, and refuses to write while any
  target word lacks a Thai meaning.

Result: `part-07` grew from 280 to 2171 rows — **1158 C1 + 1013 C2**, with
source provenance (`longdo` / `manual`) carried through the seed builder;
`part-08` holds the 7 level corrections.

## Verification

```sh
npm run verify   # lint + typecheck + tests + production build
```

- 71/71 tests pass.
- Production build succeeds; routes include `/match` and `/match/[id]`.
- Headless-Chrome smoke checks on `/`, `/match`, `/match/deck-demo`,
  `/match/deck-oxford-80`, `/deck/deck-demo`, `/study/deck-demo` show the new
  mode, toolbar, seed content and no console errors.
- Screenshots: `C:\Users\acer\Downloads\flashcard-shots\`.
