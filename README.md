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

## Features

- Search, sort, and filter sets with progressive loading.
- Create sets and edit, search, delete, or restore terms.
- Practice any nonempty set at any time. Continue learning includes due and previously missed terms; choose Still learning only, All terms, or Due now only. Missed terms remain available after leaving or reloading. Reveal answers before grading and replay rounds without resetting saved progress.
- Quiz questions use distinct answers and exclude ambiguous alternatives for the same prompt.
- Keyboard navigation, native modal dialogs, reduced-motion support, and visible storage errors.

## Data and persistence

This project has no server database or account system. Data is stored only in the current browser. Clearing site data removes it; other devices and browser profiles do not share progress.

The data layer writes decks and cards together in a versioned `fc_storage` snapshot. Each mutation validates records before a single atomic localStorage write. Failed writes preserve the previous snapshot and surface an error to the UI.

Existing `fc_decks` and `fc_cards` data migrates without changing IDs, edits, deletions, or review schedules. Legacy keys remain as a recovery copy. New installations receive the demo and Oxford vocabulary sets once; subsequent reads never replenish deleted content.

Parsing is cached. Consumers receive copies, and successful writes publish `flashcards:change`. The library also refreshes on storage events, visibility changes, and once a minute. Concurrent tabs remain last-writer-wins; this is not a synchronization service.

Use **Export backup** on the library page before clearing site data or switching devices. The download is the raw versioned snapshot; **Import backup** replaces the current library after validating it (invalid files are rejected without touching existing data).

Schema policy: additive-only. New card/deck fields must be optional and readers must tolerate them. Any breaking migration requires an export-first flow and a downgrade reader.

## Translation (EN→TH lookup)

The deck editor looks up Thai meanings through `GET /api/translate?word=`, a thin server proxy (`app/api/translate/route.ts` → `lib/translate-server.ts`) over Longdo's `mobile.php` HTML. There is no dictionary contract: parsing is regex-based and can break if Longdo changes markup. Failures return a manual-entry-friendly fallback (`word_thai` echoes the query plus `error`) and are never cached as successes; only `200` responses send `Cache-Control: public, max-age=86400`.

Limits are per server instance (in-memory): 60/min per IP + 120 requests/min and 30 upstream fetches/min globally, max 4 concurrent upstream requests, 6 s fetch timeout, 256 KB body cap, 24 h positive / 30 s negative cache. For public deploys, add edge per-IP rate limiting (e.g. Vercel WAF); in-process budgets are defense-in-depth only.

## Structure

- `app/`: library, deck editor, study and quiz routes.
- `components/`: shared controls, library cards, modal forms, and study session UI.
- `lib/store.ts`: synchronous deck/card operations.
- `lib/storage.ts`: validated persistence, migration, caching, and storage errors.
- `lib/storage-seed.ts`: initial content.
- `lib/library.ts` and `lib/use-library.ts`: library summaries and refresh lifecycle.
- `lib/editor-state.ts`: pure editor race guards plus the shared save-source resolver.
- `lib/export-import.ts`: JSON backup export/import for browser-only data.
- `lib/translate-types.ts`: shared EN–TH contracts (client + server).
- `lib/srs.ts`: review scheduling.
- `app/quiz/quiz.ts`: pure quiz generation.
- `tests/` and `app/quiz/study-quiz.test.cjs`: regression tests.

## Deployment

Use a Next.js-compatible host or run `npm run build` followed by `npm start`. No environment variables are required. The web manifest supplies app metadata; a service worker and offline route caching are not implemented.

PostCSS is overridden to 8.5.28 to avoid the vulnerable version pinned by Next.js 15. Keep the override until upgrading to a framework release with a patched dependency.
