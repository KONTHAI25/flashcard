---
reviewed: 2026-09-09
depth: deep
files_reviewed: 28
files_reviewed_list:
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
  - components/SetCard.tsx
  - components/Sheet.tsx
  - components/Toast.tsx
  - components/study-quiz/keyboard.ts
  - components/study-quiz/saveReview.ts
  - components/study/StudyPrompt.tsx
  - components/study/StudySession.tsx
  - components/ui.tsx
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Main UI Code Review Report

> Preliminary agent output. The final findings, severity counts, validation, and production verdict are in [REVIEW.md](./REVIEW.md). Several claims below were rejected or downgraded; do not use these preliminary counts for release decisions.

**Reviewed:** 2026-09-09  
**Depth:** deep  
**Files Reviewed:** 28  
**Status:** issues_found

## Summary

The baseline app and components were reviewed from commit `9769ca05cc17b3cc8e0d64516a4b0be80a5db454` with cross-file tracing through the library, study, and quiz entry points. Two production user-flow defects remain. This was a static baseline review; no browser rendering or runtime UAT was performed, and uncommitted working-tree changes were excluded.

## Warnings

### WARNING P2: “Review progress” opens an empty due-only session

**File:** `app/page.tsx:71`; `components/study/StudySession.tsx:76`  
**Issue:** When `totalDue` is zero, the library still renders a link labeled “Review progress” to `/study/all` (`app/page.tsx:71`). The id-less `StudySession` initializes its mode to `"due"` (`components/study/StudySession.tsx:76`), so clicking that advertised progress action opens the due-only queue. For a mastered set whose next reviews are in the future, or for an empty library, the destination immediately says “Nothing to review” instead of showing progress or allowing the advertised practice flow.  
**Fix:** Make the label match the destination (for example, “Practice all terms”), or pass an explicit mode to `/study/all` and initialize the session to `"all"`/`"continue"` when there are no due cards.

### WARNING P2: Deck page displays a stale time and cross-tab snapshot

**File:** `app/deck/[id]/page.tsx:192-204`, `app/deck/[id]/page.tsx:266`  
**Issue:** `loadDeck` runs only on the initial mount and when the route id changes. The page does not subscribe to the `storage`/`flashcards:change` notifications used by the library, nor schedule a time-based refresh. As a result, a page left open across a card’s due time continues to display the old due count, and edits/deletes/additions made in another tab leave the terms, quiz eligibility, mastery bar, and due count stale. If the user then adds a term, the store writes against the latest snapshot but the UI appends it to its old `cards` state, hiding any concurrently added terms until a reload.

**Fix:** Refresh the deck snapshot on the same-origin change event, visibility changes, route changes, and a bounded timer for due-time transitions. Reconcile or invalidate the editor/list state when a refresh detects concurrent changes.

---

_Reviewed: 2026-09-09_  
_Reviewer: the agent (main-ui baseline reviewer)_  
_Depth: deep_
