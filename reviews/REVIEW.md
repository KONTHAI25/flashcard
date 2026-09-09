---
status: issues_found
reviewed: 2026-09-09
scope: main-and-feature-working-tree
depth: standard
files_reviewed: 55
files_reviewed_list:
  - .env.example
  - .gitignore
  - app/api/translate/route.ts
  - app/deck/[id]/deck.module.css
  - app/deck/[id]/page.tsx
  - app/globals.css
  - app/layout.tsx
  - app/manifest.ts
  - app/page.tsx
  - app/quiz/[id]/page.tsx
  - app/quiz/page.tsx
  - app/quiz/quiz.ts
  - app/quiz/study-quiz.test.cjs
  - app/study/[id]/page.tsx
  - app/study/all/page.tsx
  - app/study/page.tsx
  - components/Button.tsx
  - components/CreateSetSheet.tsx
  - components/DeckPreview.tsx
  - components/FlashCard.tsx
  - components/Header.tsx
  - components/Icon.tsx
  - components/LoadError.tsx
  - components/PairMeta.tsx
  - components/SetCard.tsx
  - components/Sheet.tsx
  - components/Toast.tsx
  - components/study-quiz/keyboard.ts
  - components/study-quiz/saveReview.ts
  - components/study/StudyPrompt.tsx
  - components/study/StudySession.tsx
  - components/ui.tsx
  - data/vocab/index.ts
  - data/vocab/part-01.ts
  - data/vocab/part-02.ts
  - data/vocab/part-03.ts
  - data/vocab/part-04.ts
  - data/vocab/part-05.ts
  - data/vocab/part-06.ts
  - eslint.config.mjs
  - lib/library.ts
  - lib/srs.ts
  - lib/storage-seed.ts
  - lib/storage.ts
  - lib/store.ts
  - lib/study-queue.ts
  - lib/translate.ts
  - lib/types.ts
  - lib/use-library.ts
  - next.config.ts
  - package.json
  - postcss.config.mjs
  - tests/storage.test.cjs
  - tsconfig.json
  - vercel.json
main_commit: 9769ca05cc17b3cc8e0d64516a4b0be80a5db454
feature_branch: feature/b1-c2-longdo-pairs
reviewers: three GPT-5.6-Luna agents at xhigh, followed by parent validation
findings:
  critical: 2
  warning: 11
  info: 0
  total: 13
---

# Code review and production readiness

> Historical pre-fix findings. See [REVIEW-FIX.md](./REVIEW-FIX.md) for implemented fixes and current validation.

This is the final, adjudicated report. It supersedes the severity counts and release verdicts in the three preliminary agent reports. Source code was not changed.

## Verdict

**Feature: do not release yet.** Two normal editor workflows can silently replace or misassociate translations. The strict lint gate also fails. Fix these defects, correct filtered study selection, and verify the translation endpoint's deployment protections before a public release.

**Main: technically buildable and a reasonable limited-beta candidate, but not a completed production sign-off.** No confirmed P1 issue survived review. Three P2 content/UI defects remain. Browser acceptance testing and deployed behavior were not exercised. The documented product stores data only in the current browser; this verdict assumes that limitation is acceptable and does not imply account synchronization or durable backups.

Both branch tips point to `9769ca05cc17b3cc8e0d64516a4b0be80a5db454`. The feature implementation is entirely in uncommitted tracked changes and three new source files. Main was reviewed from Git and tested in a separate temporary export, preserving the working tree.

## Validation

| Check | Main commit | Feature working tree |
| --- | --- | --- |
| Existing automated tests | 29 passed | 29 passed |
| Strict ESLint gate | Passed | Failed: two unused bindings at `lib/storage-seed.ts:70` |
| Production build | Passed | Passed, with lint warnings |
| Type validation during build | Passed | Passed |
| Browser/mobile acceptance tests | Not run | Not run |
| Live Longdo integration / load tests | Not applicable | Not run |

Five offline probes confirmed the CEFR ordering bug, legacy A1 suffix behavior, duplicate source rows, malformed-metadata rendering failure, and phrase truncation with synthetic upstream HTML. Run `node reviews/verify-findings.test.cjs` to reproduce these observations. These probes intentionally confirm current defects; they are not regression tests asserting fixed behavior. No live dictionary request was made.

The agents reviewed 52 baseline files across the core/configuration and UI scopes, plus all 14 changed/new feature files. Exact scope lists appear in their reports. The parent validated key code paths and rejected or downgraded unsupported findings. Review coverage does not mean every possible defect was ruled out.

## Narrative findings

### CR-01 [BLOCKER][P1] Changing the English text can save a stale translation

**Scope:** Feature. **File:** `app/deck/[id]/page.tsx:599`, with lookup/save logic at lines 245–319.

After translating `provide`, replace the English text with `accept` and save before the 650 ms lookup starts, or after the next lookup fails. The change handler resets only `front` and `lastAutoWord`; the old answer, candidate list, provenance, and request sequence remain valid. Save accepts that old answer and persists it against the new word. An older in-flight lookup can also update the form before a replacement request starts.

**Fix:** Associate lookup results with the exact input that produced them. Invalidate pending responses and provenance immediately on input changes. Require a current translation or an explicitly confirmed manual answer before saving. Add delayed-response and failed-second-lookup editor tests.

**Evidence:** Direct state/control-flow trace. Not browser-reproduced.

### CR-02 [BLOCKER][P1] Opening an existing card can overwrite its custom answer

**Scope:** Feature. **File:** `app/deck/[id]/page.tsx:336–345`, with auto-lookup at lines 283–293 and overwrite guard at lines 268–272.

Open an existing card with a deliberately chosen Thai definition. `handleEditCard` loads the definition, then `resetTranslateState` sets `thaiTouched` to false and clears `lastAutoWord`. Opening the sheet schedules an automatic lookup. A successful result satisfies `!thaiTouched`, so it replaces the existing answer even though the user did not request a replacement. Saving a level-only edit can consequently replace a previously correct definition with the first dictionary sense.

**Fix:** Treat a loaded answer as protected existing content. Suppress automatic lookup until the English text changes, or require explicit lookup/replace confirmation for existing cards. Test opening, waiting, changing only the level, and saving.

**Evidence:** Direct state/control-flow trace, independently identified during parent validation. Not browser-reproduced.

### WR-01 [WARNING][P2] Continue fallback is evaluated outside the selected CEFR level

**Scope:** Feature. **File:** `components/study/StudySession.tsx:127–129`.

With a future-due known B1 card and a pending B2 card, choose B1 and Continue learning. Queue selection retains B2 instead of falling back to all B1 cards; subsequent filtering removes B2 and shows an empty round. Apply the deck and level filters before `selectStudyCards`.

**Evidence:** Offline probe returns zero cards for current ordering and one card for correctly scoped ordering.

### WR-02 [WARNING][P2] Anonymous translation requests have no application-level budget

**Scope:** Feature/public deployment. **File:** `app/api/translate/route.ts:200–255`, cache at line 20.

Every uncached query may create an upstream request. The handler has no request budget or concurrency control, and successful unique queries accumulate in a Map without capacity eviction. A public caller can generate repeated uncached requests independently of the editor debounce. Failed queries are not cached, so random misses still drive outbound work; only successful queries grow the cache.

**Fix:** Verify effective host-level protection or add rate/concurrency limits, bound the cache, and deduplicate requests in flight. Validate these limits before public exposure. Authentication is not inherently required for this public feature.

**Evidence:** Static handler review. No abuse test was sent. External WAF/rate-limit settings were not inspected, so this is a deployment-dependent release condition, not a demonstrated outage.

### WR-03 [WARNING][P2] Legacy A1/A2 metadata remains embedded in answers

**Scope:** Feature migration. **File:** `lib/types.ts:36–62`; duplicated suffix rule in `app/quiz/quiz.ts:8`.

The old seed created A1/A2 cards with suffixes, but normalization strips only B1–C2. Existing A1/A2 answers retain bracketed metadata and have no structured level. This is an incomplete migration, not loss of the old cards. Recognize every legacy suffix and explicitly decide how unsupported levels should be represented without falsely assigning B1.

**Evidence:** Offline probe preserves `คำ [A1]` while splitting `คำ [B1]`.

### WR-04 [WARNING][P2] Generic cards receive false English/Thai labels

**Scope:** Feature. **File:** `components/FlashCard.tsx:42–57`; related study/quiz/deck presentation.

The built-in Demo Deck still includes `2 + 2 = ?` / `4` and a capital question answered with `Paris`. New unconditional English/Thai labels misrepresent those cards and existing generic decks. Render neutral Front/Back labels unless bilingual semantics are explicit, or define and implement a consistent content migration.

**Evidence:** Seed and presentation code trace.

### WR-05 [WARNING][P2] Phrase candidates lose all but their first word

**Scope:** Feature. **File:** `app/api/translate/route.ts:69–74`.

`extractHeadword` stops at whitespace. A matching `take off [phrv]` row becomes `take`, which also prevents exact-match ranking for `take off`. Extract the complete headword before its grammatical annotation.

**Evidence:** Mocked GET with synthetic HTML returns candidate headword `take`. This does not establish compatibility with current live Longdo markup.

### WR-06 [WARNING][P2] Missed-card retries do not reapply the active filter

**Scope:** Feature/concurrent edit. **File:** `components/study/StudySession.tsx:171–176`.

Mark a B1 card as missed, change its level to C2 in another tab, then retry the missed round. Reloading by ID alone includes it despite the B1 selection. Reapply the active level and deck scope when rebuilding retries.

**Evidence:** Static control-flow trace; requires a concurrent edit.

### WR-07 [WARNING][P2] Storage validation accepts metadata that crashes rendering

**Scope:** Feature/corrupt persisted data. **File:** `lib/storage.ts:35–41`; `components/PairMeta.tsx:29–35`.

New metadata is validated by create/update helpers but not by the common snapshot validator. A card with an object-valued `level` passes `validateCard` and subsequently fails React rendering because LevelBadge renders that object as a child. Validate optional fields at the shared storage boundary, including restore/load paths.

**Evidence:** Offline validation and React server-render probe. Requires malformed persisted data; ordinary form input does not produce this value.

### WR-08 [WARNING][P2] The feature fails its strict lint gate

**Scope:** Feature. **File:** `lib/storage-seed.ts:70`.

The filter binds `en` and `th` without using them. `npm run lint` exits 1 because `--max-warnings=0` rejects both warnings. Use `([, , level])` or read `row[2]`. A successful Next build does not resolve this separate gate failure.

**Evidence:** Reproduced ESLint exit status 1; the production build passes with warnings.

### WR-09 [WARNING][P2] Vocabulary source includes 89 exact repeated tuples

**Scope:** Main and inherited feature source data. **File:** `data/vocab/part-03.ts:414`, `data/vocab/part-04.ts:12`, with further repeats in parts 04/05.

The six source arrays contain 3,000 rows but only 2,911 unique English/Thai/level tuples. Main seeds each row independently, causing repeated terms across sets. For example, `method` occurs in both cited locations. Remove accidental duplicates and add a uniqueness check; preserve intentional distinct senses. Do not rewrite stable IDs in existing installations without a migration strategy.

**Evidence:** Offline count confirmed; all six data source files match main exactly. This is not an audit of translation accuracy or Oxford list completeness.

### WR-10 [WARNING][P2] Review progress opens a due-only empty state

**Scope:** Main and inherited feature UI. **File:** `app/page.tsx:71`; main `components/study/StudySession.tsx:76` (feature line 79).

When nothing is due, the library labels its `/study/all` action Review progress. That route defaults to due-only mode, so it opens Nothing to review. Users can manually switch modes, so this is a misleading entry point rather than a complete inability to practice. Align the action label and initial mode with its destination.

**Evidence:** Static route/state trace.

### WR-11 [WARNING][P2] Deck detail remains stale across time and other tabs

**Scope:** Main and inherited feature UI. **File:** main `app/deck/[id]/page.tsx:192–204` (feature lines 230–243).

The page loads only on mount or route-ID changes. Due counts do not refresh as time passes, and another tab's card edits/additions/deletions do not update the displayed snapshot. A later local append can keep concurrently added cards hidden until reload. Subscribe to storage/change notifications and visibility/time refreshes, then reconcile the displayed snapshot.

**Evidence:** Static lifecycle trace. The library already implements a refresh pattern to reuse.

## Findings rejected or limited during adjudication

- Missing broad environment ignore patterns are a hardening opportunity, not evidence of leaked credentials. No real secret exposure was demonstrated; the application documents that no environment variables are required. The preliminary main-core P1 is rejected.
- No-op snapshot writes occur within a documented last-writer-wins design. They may merit optimization, but the preliminary report did not demonstrate an additional user-facing race beyond that known limitation. Not counted as a new defect.
- Schedule overflow requires an artificial near-maximum numeric snapshot. Deferred as defensive hardening, not a normal-use production blocker.
- The translation helper resolves an HTTP 502 fallback, but its current consumer explicitly checks empty candidates and shows an error. A hypothetical future consumer is insufficient evidence for a current defect; not counted separately.
- Labeling a user-edited legacy Oxford card Manual is ambiguous without a provenance contract. Not counted as a confirmed defect.
- Three preliminary feature P1 findings (legacy suffixes, generic labels, and filtered fallback) were downgraded to P2. Endpoint abuse is also conditional on deployment protection.

## Release follow-up

Fix CR-01/CR-02 and restore the strict lint gate. Correct queue/filter behavior and resolve the content/migration decisions. Add editor tests for stale responses and editing existing meanings, plus regression assertions for the confirmed pure-function/parser cases. Then run browser acceptance tests on fresh and migrated storage, narrow screens, cross-tab changes, and lookup failure. Verify deployed endpoint request limits and actual upstream parsing before approving the feature for public use.

Main has no confirmed critical blocker in this review. A broader release decision still needs browser acceptance evidence and an explicit decision on the three P2 findings and browser-only persistence.
