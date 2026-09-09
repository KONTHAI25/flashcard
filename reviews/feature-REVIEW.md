---
phase: feature-b1-c2-longdo-pairs
reviewed: 2026-09-09
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/deck/[id]/page.tsx
  - app/quiz/[id]/page.tsx
  - app/quiz/quiz.ts
  - components/DeckPreview.tsx
  - components/FlashCard.tsx
  - components/study/StudyPrompt.tsx
  - components/study/StudySession.tsx
  - data/vocab/index.ts
  - lib/storage-seed.ts
  - lib/store.ts
  - lib/types.ts
  - app/api/translate/route.ts
  - components/PairMeta.tsx
  - lib/translate.ts
findings:
  critical: 5
  warning: 6
  info: 0
  total: 11
status: issues_found
---

# Feature Branch Code Review Report

> Preliminary agent output. The final findings, severity counts, validation, and production verdict are in [REVIEW.md](./REVIEW.md). Several claims below were rejected or downgraded; do not use these preliminary counts for release decisions.

**Reviewed:** 2026-09-09  
**Depth:** standard  
**Files Reviewed:** 14  
**Status:** issues_found

## Summary

The B1–C2/Longdo changes were reviewed across the deck editor, study and quiz flows, storage migration, vocabulary seed, translation route, and metadata components. The review traced the new metadata through `normalizeCard`, storage mutations, queue selection, and all three presentation paths. The feature is not production ready: five P1 blockers can persist incorrect pairs, expose misleading language semantics, prevent valid filtered study sessions, or allow the public translation proxy to be abused.

`npm run typecheck` and `npm test` passed. `npm run lint` failed because of a new unused-variable warning in `lib/storage-seed.ts:70`; no browser rendering or live Longdo calls were made, per the read-only review scope, so parser behavior against upstream HTML remains limited to static analysis. The existing baseline review already identified deck-page cross-tab staleness and the `/study/all` “Review progress” mismatch; those inherited defects are excluded from the counts below. Every finding below is introduced or newly exposed by this feature.

## Narrative Findings (AI reviewer)

## Critical Issues

### BLOCKER P1: Legacy A1/A2 card suffixes are not migrated

**Files:** `lib/types.ts:27-62`; `components/DeckPreview.tsx:49-54`; `components/study/StudyPrompt.tsx:15-16`; `app/quiz/quiz.ts:8-19`  
**Issue:** The base seed stored every Oxford row from `part-01` through `part-06` as `"Thai [A1]"`, `"Thai [A2]"`, `"Thai [B1]"`, or `"Thai [B2]"`. The new `LEGACY_LEVEL_SUFFIX` only recognizes B1–C2 (`lib/types.ts:36` and `app/quiz/quiz.ts:8`). Existing installations therefore retain `[A1]`/`[A2]` in the visible Thai answer, search result, and quiz options, while their level cannot be represented or filtered. This breaks the stated backward-compatible migration for the A1/A2 cards that the previous fresh seed actually created.

**Trigger:** Open or quiz a pre-feature installation containing an A1 or A2 Oxford card, or edit it and browse it in the deck preview.

**Consequence:** Learners see implementation metadata as part of the translation, and the same card cannot participate in a clean structured-level presentation. Quiz answers also differ from the plain Thai value expected by the new pair model.

**Fix:** Parse and strip all legacy levels written by the old seed, including A1/A2. Keep a separate legacy-level type for display/migration if the new CEFR filter intentionally remains B1–C2, or migrate A1/A2 to an explicit supported representation before rendering.

### BLOCKER P1: All cards are presented as English-to-Thai pairs, including generic cards

**Files:** `lib/storage-seed.ts:11-56`; `components/FlashCard.tsx:42-57`; `components/study/StudyPrompt.tsx:37-44`; `app/quiz/[id]/page.tsx:323-330`; `app/deck/[id]/page.tsx:547-555`  
**Issue:** The unchanged Demo Deck still contains generic cards such as `What is the capital of France?` → `Paris`, and the existing data model permits arbitrary front/back text. The feature now unconditionally labels every preview, study prompt, quiz question, and deck-row side as `English`/`Thai` and `English → Thai`. Cards without bilingual metadata are consequently misrepresented as translations.

**Trigger:** Open the seeded Demo Deck, or open any pre-existing/custom deck whose cards are not English-to-Thai vocabulary.

**Consequence:** The UI asserts a false language direction and calls arbitrary answers Thai meanings, making the pair semantics incorrect for built-in and migrated content.

**Fix:** Either migrate/remove the generic seed cards and explicitly make the entire product EN→TH, or render neutral `Front`/`Back` labels unless the card carries a bilingual direction marker. Use the same condition in the deck list, preview, study prompt, and quiz.

### BLOCKER P1: A stale translation can be saved under a different English word

**File:** `app/deck/[id]/page.tsx:245-280`, `app/deck/[id]/page.tsx:304-319`, `app/deck/[id]/page.tsx:596-604`, `app/deck/[id]/page.tsx:632-647`  
**Issue:** Editing the English textarea only updates `front` and resets `lastAutoWord`; it does not invalidate `back`, `candidates`, `lookupStatus`, `usedLongdo`, or an in-flight lookup. After a successful lookup, changing `front` leaves the old Thai value and old candidate selector visible for the 650 ms debounce window. If the new lookup fails, or the user saves before it completes, `handleSaveCard` accepts that old `back` and marks the new pair as Longdo because `usedLongdo` is still true.

**Trigger:** Look up `provide`, replace the English text with `accept`, then immediately save, or let the second lookup fail and save the still-filled form.

**Consequence:** The persisted card can be `accept` → the translation for `provide`, with incorrect Longdo provenance. This is silent bilingual-pair data corruption.

**Fix:** Track the word associated with the displayed translation and require it to equal the current trimmed front before treating the result as current. On front changes, invalidate the sequence, clear or explicitly mark the back/candidates stale, reset provenance, and require a fresh lookup or deliberate manual replacement before saving.

### BLOCKER P1: The public translation proxy has no abuse controls and an unbounded cache

**File:** `app/api/translate/route.ts:19-20`, `app/api/translate/route.ts:200-255`  
**Issue:** `GET` accepts any anonymous caller and forwards every unique query up to 100 characters to Longdo. There is no authentication, per-client rate limit, concurrency limit, or upstream quota. The in-memory cache is keyed by the attacker-controlled lowercased word and never evicts expired or unique entries; each cache miss can hold a 10-second upstream request and successful entries live for 24 hours.

**Trigger:** Send many requests with distinct `word` values (for example, random 100-character strings) directly to `/api/translate`.

**Consequence:** A deployed instance can be used to amplify traffic against Longdo, exhaust its outbound request capacity, accumulate unbounded process memory, and degrade or deny service to the application. The fixed upstream URL prevents SSRF, but it does not prevent this proxy abuse.

**Fix:** Add edge/server rate limiting and a bounded request budget keyed to a client identity/IP, reject inputs outside the intended English-word/phrase grammar, cap the upstream response body, deduplicate in-flight lookups, and use a bounded LRU/TTL cache. Return a controlled error when the budget is exceeded.

### BLOCKER P1: CEFR filtering is applied after the Continue queue fallback

**File:** `components/study/StudySession.tsx:118-134`  
**Issue:** The new level filter is applied after `selectStudyCards(..., "continue")`. `selectStudyCards` falls back to all cards only when there are no pending cards in its input. A pending B2 card therefore prevents fallback even when the selected B1 subset has no pending cards.

**Trigger:** Have a future-dated/mastered B1 card and a due or still-learning B2 card, then start a deck session with `Continue learning` and the B1 filter.

**Consequence:** The session is initialized with the B2 pending card, filters it out, and reports “Nothing to review” instead of falling back to the available B1 card. The selected CEFR filter silently changes the meaning of Continue.

**Fix:** Scope cards by deck and CEFR level before calling `selectStudyCards`, so the Continue fallback is evaluated within the selected level.

## Warnings

### WARNING P2: Missed-card retry bypasses the active deck and CEFR scope

**File:** `components/study/StudySession.tsx:171-176`  
**Issue:** `handleReviewMissed` reloads only by `missedIds` and calls `startRound` without applying `id` or `matchesLevel`. A card can be edited in another tab between rounds; if its level changes, the retry still displays it despite the active CEFR filter.

**Trigger:** Start a filtered B1 round, mark a card Still learning, change that card to C2 in another deck editor/tab, then choose `Practice still learning`.

**Consequence:** The retry round violates the filter selected by the learner and can display a card outside the current set scope after concurrent edits.

**Fix:** Filter the reloaded cards by current deck (when `id` is set), `matchesLevel`, and the existing missed IDs before calling `startRound`.

### WARNING P2: HTTP 502 fallback is resolved as a successful TranslateResult

**File:** `lib/translate.ts:40-53`  
**Issue:** On any non-OK response that contains `word_thai`, `fetchTranslate` returns the fallback body cast to `TranslateResult`. The route deliberately returns such a body with `word_thai` equal to the input and `candidates: []` on Longdo timeout/fetch/parse failure. This violates the helper’s `Promise<TranslateResult>` success contract and hides the HTTP failure from callers.

**Trigger:** Longdo returns an error, times out, or its HTML parser finds no candidates; call `fetchTranslate` from a consumer that checks only promise rejection or `word_thai`.

**Consequence:** A caller can treat an echo of the English word as a real translation and label it as Longdo. The current deck page happens to inspect `candidates`, but the helper remains unsafe as a shared API.

**Fix:** Reject all non-2xx responses with a typed error, or return an explicit discriminated result such as `{ ok: false, error }`; never cast the 502 fallback to a successful `TranslateResult`.

### WARNING P2: Phrase headwords are truncated to their first token

**File:** `app/api/translate/route.ts:69-74`, `app/api/translate/route.ts:133-142`  
**Issue:** `extractHeadword` stops at whitespace (`[A-Za-z][A-Za-z'’.-]*`). Longdo supports multi-word entries, and the editor/API accept phrases, but a row such as `take off [phrv]` is returned as `headword: "take"`; exact-match ranking then also fails for the phrase.

**Trigger:** Look up a multi-word English entry such as `take off` and receive a matching Longdo row.

**Consequence:** Candidate metadata and the picker show the wrong headword, and the exact result can be ranked behind unrelated `take` rows.

**Fix:** Capture the full headword cell up to the POS annotation, normalize it, and compare that full value with the query.

### WARNING P2: New metadata is not validated when persisted snapshots are loaded

**Files:** `lib/types.ts:13-20`; `lib/store.ts:64-81`; `components/PairMeta.tsx:28-42`  
**Issue:** `validateExtras` checks `level` and `source` only for the new create/update calls. The shared `validateCard` path in `lib/storage.ts` still validates only the original scheduling/text fields, so a versioned `fc_storage` snapshot can contain arbitrary optional metadata and still load. The badge components index their style/label records with that unvalidated value.

**Trigger:** Load a snapshot containing `level: "A1"`, `source: "other"`, or non-string `wordEng`/`wordThai` in an otherwise valid card.

**Consequence:** Invalid cards bypass the storage boundary and produce inconsistent filter/badge behavior; later code that assumes the declared unions can crash or display undefined styling.

**Fix:** Validate optional metadata in `validateCard` on every load and mutation, including allowed enum values and alias string constraints (or remove the redundant aliases). Reject the snapshot with `StorageError("invalid-data", ...)` before rendering it.

### WARNING P2: New seed code fails the repository lint gate

**File:** `lib/storage-seed.ts:70`  
**Issue:** The new filter destructures `[en, th, level]` but uses only `level`, producing two `@typescript-eslint/no-unused-vars` warnings. With the repository’s `--max-warnings=0` script, `npm run lint` exits nonzero.

**Trigger:** Run the documented lint command.

**Consequence:** CI/release validation fails even though typecheck and tests pass.

**Fix:** Use `VOCAB_B1_C2.filter(row => allowed.has(row[2]))`, or otherwise avoid binding the unused tuple elements.

### WARNING P2: Migrated Oxford cards lose provenance on edit

**File:** `app/deck/[id]/page.tsx:336-345`, `app/deck/[id]/page.tsx:314-319`, `app/deck/[id]/page.tsx:547-555`  
**Issue:** Cards from the previous Oxford seed have no `source` field. The new editor therefore hides their Oxford tag, and saving one without a new lookup computes `source` as `original?.source ?? "manual"`, permanently relabeling it as manual. The deck ID still carries the stable `deck-oxford-` provenance used by the seed.

**Trigger:** Open a pre-feature Oxford card from a migrated snapshot, edit its text, and save without using Longdo.

**Consequence:** The source badge and persisted provenance change from Oxford-origin content to Manual after a routine edit.

**Fix:** During migration/normalization infer `source: "oxford"` for cards in Oxford seed decks, or preserve an explicit unknown source rather than defaulting legacy Oxford cards to manual.

## Production Verdict

Blocked. The feature needs the five P1 issues fixed and the lint gate restored before it is suitable for production. The P2 findings should be addressed in the same hardening pass, especially the error contract and retry scoping around the translation and study flows.

---

_Reviewed: 2026-09-09_  
_Reviewer: the agent (feature-b1-c2-longdo-pairs reviewer)_  
_Depth: standard_
