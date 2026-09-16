# Flashcards

A mobile-friendly flashcard library with spaced repetition and multiple-choice quizzes. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run verify` runs lint, typecheck, tests, and the production build in one command; the GitHub Actions workflow uses it on every push and pull request.

## Features

- Search, sort, and filter sets with progressive loading.
- Create sets and edit, search, delete, or restore terms.
- Practice any nonempty set at any time. Continue learning includes due and previously missed terms; choose Still learning only, All terms, or Due now only. Missed terms remain available after leaving or reloading. Reveal answers before grading and replay rounds without resetting saved progress.
- Quiz questions use distinct answers and exclude ambiguous alternatives for the same prompt.
- Quizlet-style study controls: shuffle the remaining cards, swap English/Thai prompt direction, and review round stats (known, still learning, accuracy, time).
- Find the pair (Match): tap an English term and its Thai meaning on a timed board; wrong tries and elapsed time appear in the round summary.
- Keyboard navigation, native modal dialogs, reduced-motion support, and visible storage errors.

## Data and persistence

This project has no server database or account system. Data is stored only in the current browser. Clearing site data removes it; other devices and browser profiles do not share progress.

The data layer writes decks and cards together in a versioned `fc_storage` snapshot. Each mutation validates records before a single atomic localStorage write. Failed writes preserve the previous snapshot and surface an error to the UI.

Existing `fc_decks` and `fc_cards` data migrates without changing IDs, edits, deletions, or review schedules. Legacy keys remain as a recovery copy. New installations receive the demo and Oxford vocabulary sets once; subsequent reads never replenish deleted content.

Parsing is cached. Consumers receive copies, and successful writes publish `flashcards:change`. The library also refreshes on storage events, visibility changes, and once a minute. Concurrent tabs remain last-writer-wins; this is not a synchronization service.

Use **Export backup** on the library page before clearing site data or switching devices. The download is the raw versioned snapshot; **Import backup** replaces the current library after validating it (invalid files are rejected without touching existing data).

Schema policy: additive-only. New card/deck fields must be optional and readers must tolerate them. Any breaking migration requires an export-first flow and a downgrade reader.

## Translation (EN→TH lookup)

Existing answers are protected when the editor opens. Changing a bilingual word invalidates its previous translation, and delayed lookups cannot overwrite a later manual answer. Generic cards retain Front/Back labels and can be edited without automatic translation. Existing A1/A2 metadata is preserved alongside B1–C2; fresh vocabulary seeds exclude exact duplicate tuples without rewriting saved cards or progress.

### C1/C2 vocabulary completion

`data/vocab/part-07.ts` holds the completed C1/C2 set: the original curated A–C batch plus every missing headword from two openly documented source lists.

- **C1:** The Oxford 5000 by CEFR level (C1 section), Oxford University Press — `data/vocab/sources/oxford-5000-c1-words.txt`.
- **C2:** Octanove Vocabulary Profile C1/C2 v1.0 (CC BY-SA 4.0, Octanove Labs / CEFR-J, distributed by Open Language Profiles) — `data/vocab/sources/octanove-c2-words.txt`.
- **Thai meanings:** Longdo (NECTEC Lexitron EN–TH) with MyMemory as a fallback, plus 141 reviewed entries in `data/vocab/sources/translation-overrides.json`. Rows generated this way are tagged `source: "longdo"` or `"manual"`; older curated rows keep the Oxford badge.
- **Level corrections:** seven words that were sitting in part-07 with an incorrect level (`accuracy`, `admire`, `agenda`, `ambition`, `antique`, `arrogant`, `asset`) moved to `data/vocab/part-08.ts` with their verified B1/B2 level.

Regenerate the pair files from the committed source lists (requires network access to Longdo/MyMemory):

```sh
node scripts/build-c1c2-pairs.cjs --write
```

The script caches responses in `/tmp/flashcard-c1c2-cache.json`, so interrupted runs resume and re-runs are deterministic against the same upstream data. `tests/vocab-c1c2.test.cjs` enforces unique English headwords, Thai script, reviewed counts, and 100% headword coverage of both source lists in CI (no network needed).

The deck editor looks up Thai meanings through `GET /api/translate?word=`, a thin server proxy (`app/api/translate/route.ts` → `lib/translate-server.ts`) over Longdo's `mobile.php` HTML. There is no dictionary contract: parsing is regex-based and can break if Longdo changes markup. Failures return a manual-entry-friendly fallback (`word_thai` echoes the query plus `error`) and are never cached as successes; only `200` responses send `Cache-Control: public, max-age=86400`.

Limits are per server instance (in-memory): 60/min per IP + 120 requests/min and 30 upstream fetches/min globally, max 4 concurrent upstream requests, 6 s fetch timeout, 256 KB body cap, 24 h positive / 30 s negative cache. For public deploys, add edge per-IP rate limiting (e.g. Vercel WAF); in-process budgets are defense-in-depth only.

## Structure

- `app/`: library, deck editor, study, quiz, and Find-the-pair (match) routes.
- `components/`: shared controls, library cards, modal forms, and study session UI.
- `lib/match.ts`: pure Find-the-pair board/selection/scoring logic.
- `lib/study-settings.ts`: pure shuffle/swap presentation settings.
- `lib/store.ts`: synchronous deck/card operations.
- `lib/storage.ts`: validated persistence, migration, caching, and storage errors.
- `lib/storage-seed.ts`: initial content.
- `lib/library.ts` and `lib/use-library.ts`: library summaries and refresh lifecycle.
- `lib/editor-state.ts`: pure editor race guards plus the shared save-source resolver.
- `lib/export-import.ts`: JSON backup export/import for browser-only data.
- `lib/translate-types.ts`: shared EN–TH contracts (client + server).
- `lib/srs.ts`: review scheduling.
- `app/quiz/quiz.ts`: pure quiz generation.
- `data/vocab/sources/`: committed C1/C2 headword lists and reviewed translation overrides.
- `scripts/build-c1c2-pairs.cjs`: resumable build-time data tool for the C1/C2 pairs.
- `tests/` and `app/quiz/study-quiz.test.cjs`: regression tests, including data-completion coverage.

## Deployment

Use a Next.js-compatible host or run `npm run build` followed by `npm start`. No environment variables are required. The web manifest supplies app metadata; a service worker and offline route caching are not implemented.

PostCSS is overridden to 8.5.28 to avoid the vulnerable version pinned by Next.js 15. Keep the override until upgrading to a framework release with a patched dependency.
