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
- Review due terms by set or across the library. Reveal the answer before grading; retry missed terms afterward.
- Quiz questions use distinct answers and exclude ambiguous alternatives for the same prompt.
- Keyboard navigation, native modal dialogs, reduced-motion support, and visible storage errors.

## Data and persistence

This project has no server database or account system. Data is stored only in the current browser. Clearing site data removes it; other devices and browser profiles do not share progress.

The data layer writes decks and cards together in a versioned `fc_storage` snapshot. Each mutation validates records before a single atomic localStorage write. Failed writes preserve the previous snapshot and surface an error to the UI.

Existing `fc_decks` and `fc_cards` data migrates without changing IDs, edits, deletions, or review schedules. Legacy keys remain as a recovery copy. New installations receive the demo and Oxford vocabulary sets once; subsequent reads never replenish deleted content.

Parsing is cached. Consumers receive copies, and successful writes publish `flashcards:change`. The library also refreshes on storage events, visibility changes, and once a minute. Concurrent tabs remain last-writer-wins; this is not a synchronization service.

## Structure

- `app/`: library, deck editor, study and quiz routes.
- `components/`: shared controls, library cards, modal forms, and study session UI.
- `lib/store.ts`: synchronous deck/card operations.
- `lib/storage.ts`: validated persistence, migration, caching, and storage errors.
- `lib/storage-seed.ts`: initial content.
- `lib/library.ts` and `lib/use-library.ts`: library summaries and refresh lifecycle.
- `lib/srs.ts`: review scheduling.
- `app/quiz/quiz.ts`: pure quiz generation.
- `tests/` and `app/quiz/study-quiz.test.cjs`: regression tests.

## Deployment

Use a Next.js-compatible host or run `npm run build` followed by `npm start`. No environment variables are required. The web manifest supplies app metadata; a service worker and offline route caching are not implemented.

PostCSS is overridden to 8.5.28 to avoid the vulnerable version pinned by Next.js 15. Keep the override until upgrading to a framework release with a patched dependency.
