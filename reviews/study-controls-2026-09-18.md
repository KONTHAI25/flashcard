# Study controls and Shuffle review

Reviewed implementation: `eee1ca1`, based on `main` at `3c4cc83`.

## Scope and behavior

The study card header now groups language direction and metadata clearly, and
both prompt and answer captions follow Swap. Grading controls use scoped styles,
readable warm/green states, keyboard hints, visible focus, and reduced-motion
support. Labels wrap instead of truncating on narrow screens.

Shuffle previously excluded the current card even before reveal and could draw
an unchanged order. It now changes the first eligible card when at least two
remain. Revealed cards stay pinned for grading. Turning Shuffle off restores
pending round order without resetting progress or writing storage. Round
initialization applies Shuffle once, including filter remounts.

Two GPT-5.6-Luna workers at xhigh implemented separate UI and logic scopes.
The orchestrator provided advice and reviewed the changes. Sol was stopped at
the user's request. The Shuffle worker hit its usage limit before finishing;
the orchestrator completed integration fixes and regression coverage.

## Review findings resolved

- Guaranteed that the first eligible card changes, even if a random permutation
  changes only later cards or is an identity permutation.
- Prevented double shuffling when a two-card round remounts with Shuffle enabled.
- Preserved current card objects when restoring order; missing cards are not
  resurrected and reviewed cards are not repeated.
- Made the revealed-card explanation visible and cleared it after grading.
- Improved disabled/caption contrast and honored reduced motion.
- Updated the route-wiring unit loader to treat CSS modules as style assets.
- Corrected the UI test fixture to include explicit bilingual metadata.

No unresolved merge-blocking findings remain in this scope.

## Verification

Windows, Node `v24.15.0`, dependencies installed with `npm ci` in an isolated
worktree. The following checks cover the committed implementation:

- `npm run verify`: lint, typecheck, 89 unit tests, and production build passed.
- The subsequent test-only bilingual fixture correction passed focused ESLint
  and `tsc --noEmit`; application source and production build were unchanged.
- `npm run test:e2e:run`: 61 passed, 5 skipped, 0 failed. The five skips are the
  existing mobile hydration stress cases.
- `git diff --check`: passed.
- Production Chromium visual checks at 320x900 and 1280x900: full grading labels,
  readable revealed answer, aligned metadata, and distinct grading states.
- Manual Shuffle check: hidden prompt changes on enable and returns to original
  pending order on disable. Browser regressions also cover saved-data invariance,
  revealed grading targets, each card appearing once, and two-card remounts.

Screenshots remain outside Git in `C:/Users/acer/Downloads/flashcard-shots/`:
`study-controls-mobile-final.png` and `study-controls-desktop-final.png`.
These are local Windows results; Linux/Node 22 CI and deployment are separate.
