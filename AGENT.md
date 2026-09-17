# AGENT.md — AI agent guide for the Flashcards project

> Operating guide for AI coding agents working in this repository. Read this
> before changing `app/`, `components/`, `lib/`, `data/vocab/`, `tests/` or
> `.github/`. Human-facing docs live in [README.md](README.md); historical
> review evidence lives in [`reviews/`](reviews/). Update this file whenever
> commands, data sources, contracts, deployment or project status change.

## 1. Project summary

A local-first, mobile-friendly flashcard library with spaced repetition,
multiple-choice quizzes and a Quizlet-style Find-the-Pair game. Built with
**Next.js 15.5 / React 19 / TypeScript / Tailwind CSS 4**.

- No accounts, no database, no required environment variables.
- Decks, cards and review schedules live in browser `localStorage`
  (`fc_storage`, versioned snapshot).
- One server route: `GET /api/translate` (Longdo EN–TH proxy).
- C1/C2 vocabulary was completed from documented open sources; the app seeds
  1,158 C1 + 1,013 C2 pairs on fresh installations.

## 2. Commands

```sh
npm ci                 # reproducible install (Node 22+; see .nvmrc)
npm run dev            # local dev server, http://localhost:3000
npm run lint           # eslint . --max-warnings=0
npm run typecheck      # tsc --noEmit
npm test               # node --test tests/*.test.cjs app/quiz/*.test.cjs
npm run build          # next build (production)
npm start              # serve the production build
npm run verify         # lint + typecheck + test + build (CI uses this)
npm run build:pairs    # regenerate C1/C2 data (needs network; see §4.3)
npm run test:e2e       # build, then desktop + mobile Chromium E2E tests
npm run test:e2e:run   # E2E against the existing production build (used in CI)
npm run test:e2e:ui    # build, then interactive Playwright runner
```

Always run `npm run verify` before considering a change complete. CI
(`.github/workflows/ci.yml`) runs the same command on push/PR, then installs
Chromium and runs `npm run test:e2e:run`. For UI changes, also run E2E locally;
install its browser first with `npx playwright install chromium`.

## 3. Repository map

| Path | Responsibility | Notes |
| --- | --- | --- |
| `app/` | Routes: library, deck editor, study, quiz, match | Next.js App Router; client components for storage-backed pages |
| `components/` | Shared UI, study/quiz widgets, icons, toasts | Keep storage access out of leaf presentation components |
| `lib/storage.ts` | Versioned localStorage snapshot, validation, migration | Atomic writes; invalid data never overwrites the previous snapshot |
| `lib/storage-seed.ts` | Fresh-install seed data | 50-card Oxford chunks; four-optional tuple provenance |
| `lib/store.ts` | Synchronous deck/card CRUD | Returns copies; emits `flashcards:change` |
| `lib/library.ts` | Deck summaries, progress (`cardProgress`, `deckProgress`) | Single source of truth for learned/remaining/not-started |
| `lib/srs.ts`, `lib/study-queue.ts` | Scheduling and study modes | Pure functions; heavily tested |
| `lib/match.ts` | Find-the-Pair board/selection/scoring logic | Pure; DOM-free tests |
| `lib/study-settings.ts` | Shuffle / swap session settings | Pure; never mutates saved cards |
| `lib/translate*.ts` | EN→TH client, server proxy, limits, types | Do not cache negative fallbacks as successes |
| `data/vocab/part-01..08.ts` | Vocabulary rows | Parts 01/02 are legacy A1/A2, not seeded |
| `data/vocab/sources/` | C1/C2 headword lists, overrides, license notes | See §4.3 |
| `scripts/build-c1c2-pairs.cjs` | Resumable C1/C2 generator | Build-time tool; ESLint-ignored on purpose |
| `tests/`, `app/quiz/*.test.cjs` | Regression suite | `node --test` + on-the-fly TypeScript transpile; report the count from the tested checkout |
| `tests/e2e/`, `playwright.config.ts` | Desktop/mobile browser regression suite | Production server on loopback port 3100; isolated storage; see `tests/e2e/README.md` |

## 4. Architecture and data contracts

### 4.1 Storage

- One versioned snapshot (`version: 1`) under `fc_storage`.
- Legacy `fc_decks` / `fc_cards` data migrates without changing IDs,
  edits, deletions or review schedules; legacy keys remain as a recovery copy.
- Every mutation validates and writes atomically. A failed write preserves the
  previous snapshot and surfaces a storage error to the UI.
- Schema policy is **additive-only**: new card/deck fields must be optional and
  readers must tolerate them. Any breaking migration needs an export-first flow
  and a downgrade reader.
- Fresh installs receive demo + Oxford seed **once**. Subsequent reads never
  replenish deleted content.
- Export/import (`lib/export-import.ts`) is the only portability path; invalid
  backups are rejected without touching existing data.

### 4.2 Seed data

- `buildInitialData()` in `lib/storage-seed.ts` chunks `VOCAB_B1_C2` into
  50-card `deck-oxford-NN` decks (plus `deck-demo`). Current total: 83 sets /
  4,093 cards before user data.
- Optional 4th tuple element on vocabulary rows is the provenance
  (`"longdo"` / `"manual"`); legacy 3-element rows keep the Oxford badge.
- New seed content only affects fresh installations by design. Do not add a
  migration that resurrects deleted cards without export-first semantics and
  tests.

### 4.3 C1/C2 vocabulary completion pipeline

- **C1 source:** The Oxford 5000 by CEFR level (C1 section), Oxford University
  Press — `data/vocab/sources/oxford-5000-c1-words.txt`.
- **C2 source:** Octanove Vocabulary Profile C1/C2 v1.0 (CC BY-SA 4.0,
  Octanove Labs / CEFR-J, via Open Language Profiles) —
  `data/vocab/sources/octanove-c2-words.txt`.
- **Thai meanings:** Longdo (NECTEC Lexitron EN–TH) with MyMemory fallback;
  reviewed corrections live in `translation-overrides.json` and are
  authoritative over the response cache.
- `part-07.ts` is a generated file: **edit the source lists or the overrides,
  then regenerate**, never hand-edit generated rows.
- Generator contract (`scripts/build-c1c2-pairs.cjs`):
  resumable (`/tmp/flashcard-c1c2-cache.json`), idempotent, refuses to write
  while any target word lacks an acceptable Thai meaning, rejects IPA/reading
  stubs, dictionary tags, slang and Latin leftovers.
- `tests/vocab-c1c2.test.cjs` enforces: C1/C2-only part-07, unique normalized
  English, Thai script, minimum counts (≥1100 C1 / ≥950 C2) and 100% coverage
  of both committed source lists. Current result: **2,171 rows
  (1,158 C1 + 1,013 C2)**; `part-08.ts` holds the seven verified B1/B2
  corrections (`accuracy`, `admire`, `agenda`, `ambition`, `antique`,
  `arrogant`, `asset`).

## 5. Testing and TDD rules

- Write the failing test first for every behavioral change. Pure logic goes in
  `lib/` and is tested without a DOM.
- Tests use `node:test` + `node:assert/strict` and load TypeScript via the
  project’s `typescript` dependency (see existing `.test.cjs` files). Do not
  add jsdom/testing-library unless the task explicitly requires it.
- `tests/storage.test.cjs` compiles the storage layer and enforces atomicity,
  migration and deduplication guarantees. Keep those contracts.
- All lint warnings are errors (`--max-warnings=0`). Build must remain green.
- Include the exact command, tested commit or working-tree state, Node version,
  and actual result in PR/commit notes. Do not copy a historical test count.
- CI uses Node 22 from `.github/workflows/ci.yml`, matching `.nvmrc`. A local
  pass on another supported Node version is useful but is not a Node 22 CI run.
- For links that show a filtered count, verify that the destination selects the
  same cards. Cover mixed decks containing unstarted, still-learning, and due
  learned cards; pure queue tests alone do not verify link wiring.
- Browser E2E uses Playwright with fresh contexts and a small version-1 storage
  fixture. Seed once per context; never reset data on navigation or use a real
  browser profile. Translation responses are mocked. Use accessible selectors,
  auto-waiting assertions, and traces instead of fixed sleeps.
- Do not suppress uncaught browser errors to make E2E pass. A green unit suite
  does not prove hydration or browser interactions are correct.

## 6. UI/UX conventions

- Visual language: Quizlet-like light UI, primary `#4255FF`, rounded cards,
  bold titles, large tap targets (≥44 px).
- Study modes: Flashcards (`/study/[id]`), Practice quiz (`/quiz/[id]`),
  Find the Pair (`/match/[id]`).
- Session-only controls (Shuffle, Swap) must never mutate stored cards or
  schedules.
- Remaining means attempted but not learned (`summaryRemaining`), not all
  unlearned cards. A link offering to replay that count must select `learning`
  mode explicitly. `/study/[id]?mode=learning` passes the mode into
  `StudySession`; absent or unknown modes default to `continue`, which also
  includes other due cards. Preserve this link-to-route contract.
- Accessibility is part of “done”: labels, focus-visible rings, keyboard
  shortcuts guarded by `components/study-quiz/keyboard.ts`, `aria-live`
  feedback, reduced-motion support, no nested interactive elements.
- Prefer adding reusable, tested helpers to `lib/`; keep components thin.
- Reuse `components/Icon.tsx` rather than adding one-off SVGs where possible.
  On `feature/ui-icons`, it renders decorative spans using the vendored UIcons
  font. Keep controls named independently of their icons and keep all font/mask
  assets local. Attribution records live in `public/icons/ATTRIBUTION.md`.

## 7. Workstream history

Two isolated tracks were run (no subagent tool available in that environment),
each with its own branch and test contract, then merged with `--no-ff`:

- `agent/ui-quizlet` → merge `a73b957`: Quizlet-style set cards, deck mode
  chooser, study toolbar (Shuffle/Swap), round stats, `/match` routes,
  `lib/match.ts`, `lib/study-settings.ts`, tests.
- `agent/c1c2-pairs` → merge `64b2d97`: completed C1/C2 dataset, source lists,
  overrides, generator, `part-08` corrections, storage/seed provenance,
  `tests/vocab-c1c2.test.cjs`, CI `verify` script.

## 8. Deployment runbook

### 8.1 Pre-deploy gate

```sh
npm ci
npm run verify
npm start   # smoke test /, /match, /match/deck-demo, /deck/deck-demo, /study/deck-demo
```

Also exercise one deck-editor “Lookup Thai” to confirm `/api/translate` can
reach Longdo from the host.

### 8.2 Recommended host — Vercel via GitHub

1. `git push origin main` after checking `git log --oneline origin/main..HEAD`.
2. Import `KONTHAI25/flashcard` at https://vercel.com/new.
3. Framework preset Next.js (auto), root `./`, build `npm run build`, output
   default, **no environment variables**. Deploy.
4. Pushes to `main` are production; PRs are previews.
5. If Node is too old: Project → Settings → General → Node.js Version → 22.x.

CLI alternative:

```sh
npm i -g vercel
vercel login
vercel          # preview
vercel --prod   # production
```

### 8.3 CI/CD contract

- `.github/workflows/ci.yml`: every push/PR runs `npm ci` then
  `npm run verify`, installs Chromium with Linux dependencies, and runs
  `npm run test:e2e:run` (15-minute timeout, concurrency-cancelled).
- CI proves the build; it does **not** deploy. Vercel Git integration performs
  CD on `main` and previews on PRs.
- Optional: require the CI status check on `main`; add explicit Vercel tokens
  only if replacing Git integration with an Actions deploy job.
- Review workflow YAML and live Actions results separately. Record the run URL
  and SHA; a green run for `origin/main` does not validate a local branch or
  uncommitted changes. Check branch protection separately before claiming that
  CI is a required merge gate.
- Workflow permissions are explicitly `contents: read`. E2E reports and failure
  traces are uploaded for seven days; generated `playwright-report/`,
  `test-results/`, and `blob-report/` directories must remain untracked.

### 8.4 Alternative hosts

- **Render/Railway:** build `npm ci && npm run build`, start `npm start`,
  Node 22, health check `/`, no env vars.
- **VPS:** Node 22 + systemd (`Environment=PORT=3000 NODE_ENV=production`,
  `ExecStart=/usr/bin/npm start`) behind Nginx reverse proxy to
  `127.0.0.1:3000`; Certbot for TLS. Update with
  `git pull && npm ci && npm run build && systemctl restart flashcard`.

### 8.5 Post-deploy checklist

- `/` loads and a fresh/incognito browser seeds Demo + Oxford decks.
- `/match`, `/match/deck-demo`, `/study/deck-demo` render without console errors.
- Deck page shows Flashcards / Practice quiz / Find the pair.
- “Lookup Thai” returns a candidate; export/import backup still works.
- Mobile ≈390 px is usable; TLS/domain works; GitHub Actions is green.

## 9. Known caveats and risks

- **Existing browser data is not migrated.** Completed C1/C2 pairs seed fresh
  installations only; older browser profiles keep their old library. An
  additive seed-upgrade migration needs export-first semantics and new tests.
- **Data is per browser profile.** Export before clearing site data; there is
  no cross-device sync.
- **localStorage quota** holds ~4,089 seeds plus user cards. On quota errors,
  export a backup and remove unused sets.
- **Translation budgets are per server instance** (60/min per IP, 30 upstream
  fetches/min, 4 concurrent, 6 s timeout). Serverless cold starts clear the
  cache; add edge/WAF per-IP limiting for public traffic.
- **Longdo is external.** If unreachable, lookups fail soft and manual Thai
  entry works; never cache a negative fallback as success.
- **No service worker/offline cache.** The manifest only provides install
  metadata.
- Keep the `postcss` `8.5.28` override until Next.js ships a patched version.

## 10. Guardrails for agents

- Do not touch or commit the unrelated untracked exam-monitor project files:
  `configs/`, `docs/contracts.md`, `docs/vision-benchmark.md`, `models/`,
  `scripts/vision_benchmark.py`, `src/exam_monitor/`, `tests/fixtures/`,
  `tests/vision/`.
- `.gitattributes` normalizes LF. Inspect line-ending diffs before staging;
  if normalization is needed, restrict `git add --renormalize -- <paths>` to
  the intended files. Never stage the entire dirty workspace to fix line endings.
- Before reviewing unmerged work, fetch remote refs, inspect `git status`, and
  compare each candidate branch with the target using `git log target..branch`
  and `git diff target...branch`. Test branch commits in a detached worktree
  when this checkout contains unrelated edits. Preserve those edits and report
  branch-only results separately from working-tree results.
- A review request does not itself request a merge or push. Record findings
  before merging, and only merge or publish when the user requests it.
- Never commit build output (`.next/`), translation caches, screenshots or
  secrets. Do not invent environment variables; none are required.
- Do not reorder vocabulary parts lightly: seed chunking gives new cards their
  IDs, and ordering changes only affect fresh installations.
- Keep `reviews/` as historical evidence; put current operating rules here.

## 11. Last reviewed status (2026-09-17)

- `main` and fetched `origin/main` are at `5361eac`, containing the reviewed
  flashcard bug fixes and remaining-card feature.
- The current review covers `feature/ui-icons` at `5656d6d`. Its branch history
  lacks main's `d783f0a` bug-fix commit, although the working tree contains the
  same three source fixes and their untracked regression test. Do not confuse
  a working-tree pass with verification of the branch tip alone.
- Playwright E2E infrastructure and the updated CI workflow are local changes.
  Review results, verification counts, and the inherited hydration issue are
  recorded in [`reviews/ui-icons-e2e-review-2026-09-17.md`](reviews/ui-icons-e2e-review-2026-09-17.md).
- Production-browser checks have exposed intermittent React hydration error
  #418 on both the icon working tree and clean main. Keep the E2E browser-error
  assertion enabled; do not report an affected run as green.
- RESOLVED (2026-09-17): the #418 was a React 19.2.8 hydration retry defect —
  after a mid-walk suspension the retried render re-claimed the root layout's
  `main` with a stale walk pointer. Next 15.5.25 streamed the trigger refs
  (metadata/params) in a later flight chunk, so an early-executing main bundle
  raced them under CPU load. Fixed by upgrading to Next 16.3.5 + React 19.3.0
  (with `type: commonjs` removed and the ESLint config migrated to the native
  flat exports). Instrumented parallel-load stress (~1,800 loads) went from
  repeated hits to zero; `hydration-stress.spec.ts` guards the regression.
- Local verification uses Node 24.15.0; CI uses Node 22. Recheck refs,
  working-tree state, and the specific remote run before deployment.
- Headless-Chrome smoke screenshots:
  `C:\Users\acer\Downloads\flashcard-shots\`.
