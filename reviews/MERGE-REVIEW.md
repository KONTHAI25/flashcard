# Architecture branch merge review

Reviewed 2026-09-09: `fix/architecture-review-fixes` (starting at `21c6d9b`) against `main` (`9769ca0`), including pending corrections from the previous review. Fetch found no newer remote branch. This was the only local branch ahead of main.

## Additional findings resolved

- **P1: Backup recovery depends on valid existing storage.** Import previously called the read/modify/write path, which rejected damaged snapshots before restoring a valid backup. Replacement now validates the incoming snapshot and writes it directly once. Invalid imports do not seed an empty installation; failed writes preserve the old snapshot.
- **P2: Recovery controls hidden by the library error state.** The handled storage error bypassed the route boundary and displayed only Retry. It now exposes raw-data download and backup import, with library refresh after restoration.
- **P2: File selection silently replaces all sets and progress.** Import now requires an explicit replacement confirmation; cancellation leaves storage unchanged.

Also corrected the review-write comment: synchronous read/modify/write reduces stale reads but independent tabs remain last-writer-wins.

The prior editor, translation, metadata, study and seed fixes are included; see REVIEW-FIX.md and browser-checks.md for their earlier evidence. The added architecture helpers, storage refresh lifecycle, error boundaries, security headers and CI workflow were inspected for integration problems.

## Validation

- 57 tests pass, including three new backup regression tests covering corrupt/absent snapshots, invalid imports and quota failures.
- Strict ESLint, TypeScript and production build pass.
- `git diff --check` passes.
- Command outputs: merge-tests.log, merge-lint.log, merge-typecheck.log, merge-build.log.
- The new confirmation and error-screen controls were inspected in code and included in the successful build; they were not separately exercised in a browser during this merge review. Earlier browser evidence remains in browser-checks.md.

## Readiness

No remaining merge blockers were identified in this review. Suitable for merging the browser-local application; this does not establish deployed production readiness. Multi-instance translation limits still need host controls, dictionary HTML is an external dependency, and localStorage is last-writer-wins across tabs. Deployment configuration and live production operations were not tested. Merge is local; no push or deployment is included. Unrelated gao.html is excluded.
