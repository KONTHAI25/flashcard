---
phase: main-core
reviewed: 2026-09-09
depth: deep
files_reviewed: 24
files_reviewed_list:
  - .env.example
  - .gitignore
  - data/vocab/index.ts
  - data/vocab/part-01.ts
  - data/vocab/part-02.ts
  - data/vocab/part-03.ts
  - data/vocab/part-04.ts
  - data/vocab/part-05.ts
  - data/vocab/part-06.ts
  - lib/library.ts
  - lib/srs.ts
  - lib/storage-seed.ts
  - lib/storage.ts
  - lib/store.ts
  - lib/study-queue.ts
  - lib/types.ts
  - lib/use-library.ts
  - tests/storage.test.cjs
  - eslint.config.mjs
  - next.config.ts
  - package.json
  - postcss.config.mjs
  - tsconfig.json
  - vercel.json
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Main Core Code Review Report

> Preliminary agent output. The final findings, severity counts, validation, and production verdict are in [REVIEW.md](./REVIEW.md). Several claims below were rejected or downgraded; do not use these preliminary counts for release decisions.

**Reviewed:** 2026-09-09  
**Depth:** deep  
**Files Reviewed:** 24  
**Status:** issues_found

## Summary

The committed baseline at `9769ca05cc17b3cc8e0d64516a4b0be80a5db454` was reviewed from `git show`, including all storage/store/SRS/queue callers needed to trace persistence behavior, all 3,000 vocabulary rows, the storage tests, and package/deployment configuration. The baseline is not production-ready: one P1 secret-handling gap can expose deployment credentials, and three P2 defects affect multi-tab persistence, recoverability of extreme schedules, and seeded vocabulary coverage.

This is a static baseline review. The working tree contains unrelated uncommitted changes, so no checkout, install, source edit, or baseline runtime test was performed. The duplicate count was obtained by parsing the six committed vocabulary arrays; the concurrency and overflow findings are code-path reproductions and still need browser/runtime regression tests.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01 [BLOCKER][P1]: Secret-bearing environment files are not ignored

**File:** `.gitignore:27-28`; `.env.example:1-3`  
**Classification:** BLOCKER (P1)  
**Issue:** The ignore rule only covers `.env*.local`. A developer who copies the repository's credential-shaped `DATABASE_URL` example into `.env`, `.env.development`, or `.env.production` can stage and commit the resulting secret because none of those paths is ignored. Next.js uses these environment-file names, and a leaked database URL is a credential exposure even though the checked-in example value is a placeholder.
**Fix:** Ignore all environment files while explicitly keeping the example template tracked:

```gitignore
.env
.env.*
!.env.example
```

Also scan the existing history and revoke any real credentials that may already have been committed.

## Warnings

### WR-01 [WARNING][P2]: No-op store calls can overwrite a newer snapshot

**File:** `lib/storage.ts:130-137`; `lib/store.ts:24-43`, `lib/store.ts:69-94`  
**Classification:** WARNING (P2)  
**Issue:** `changeStorage` always calls `persist` after the callback, even when the callback made no change. `updateDeck`/`updateCard` return `null` for a missing ID, `deleteDeck`/`deleteCard` return `null` without changing valid data, and `restoreCard` skips an existing ID, yet each path still writes and emits `flashcards:change`. In the documented multi-tab last-writer-wins model, a tab can read snapshot S, another tab can commit S2, and the first tab's no-op call can then write its stale copy of S back, losing the other tab's real update. Even without a race, a no-op can fail with a quota error and trigger needless refreshes.
**Fix:** Track whether the callback changed the snapshot and skip `persist` and event dispatch for no-ops. For example, serialize a validated copy before and after the callback (or make the mutation callback return an explicit `changed` flag) and only publish when the data actually changed. Add a two-tab/interleaving regression test.

### WR-02 [WARNING][P2]: Finite but unbounded schedules can overflow during review

**File:** `lib/storage.ts:28-41`; `lib/srs.ts:11-44`  
**Classification:** WARNING (P2)  
**Issue:** The storage validator accepts any finite nonnegative `interval`, `due`, and `ease`, including `Number.MAX_VALUE`. A valid snapshot containing `interval: Number.MAX_VALUE` loads successfully, but a Good review reaches `Math.round(interval * ease)` in `lib/srs.ts:27`; even after the ease clamp this becomes `Infinity`, and `due` becomes `Infinity` at line 42. `updateCard` then rejects the result because its validator disallows non-finite values, leaving that otherwise loadable card permanently unreviewable. This can be reproduced by placing such a card in a version-1 `fc_storage` snapshot before opening study mode.
**Fix:** Define and enforce a domain maximum for interval/due (and the 1.3–3.0 ease range) when loading and updating cards, and cap multiplication in `reviewCard` before calculating `due`. Treat out-of-domain persisted schedules as invalid data or repair them deterministically before presenting the card.

### WR-03 [WARNING][P2]: Seeded Oxford data contains 89 exact duplicate tuples

**File:** `data/vocab/part-03.ts:414`; `data/vocab/part-04.ts:12`; `data/vocab/part-04.ts:465-500`; `data/vocab/part-05.ts:371-491`; `lib/storage-seed.ts:30-37`  
**Classification:** WARNING (P2)  
**Issue:** Parsing all six committed 500-row arrays finds 89 exact duplicate `[English, Thai, level]` tuples: 47 duplicate rows cross from part 03 into part 04, and 42 cross from part 04 into part 05. For example, `method` appears at `part-03.ts:414` and `part-04.ts:12`, while the B2 block beginning with `prohibit` is repeated at `part-04.ts:465` and `part-05.ts:371`. `buildOxfordSeed` concatenates every row and chunks by position without deduplication, so the fresh installation creates 3,000 cards but only 2,911 unique tuples; users repeat terms across sets and 89 intended vocabulary slots are missing.
**Fix:** Remove the duplicated source rows and add a build-time uniqueness assertion. If deduplication is retained as a safety net, dedupe before calculating chunk ranges and generating card IDs so deck counts and displayed ranges describe the actual unique data.

---

_Reviewed: 2026-09-09_  
_Reviewer: the agent (main-core baseline reviewer)_  
_Depth: deep_
