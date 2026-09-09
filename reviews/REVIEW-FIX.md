---
status: fixed_pending_deployment_validation
reviewed: 2026-09-09
findings_in_scope: 13
fixed: 13
skipped: 0
---

# Review fixes

The 13 adjudicated source-code findings in REVIEW.md have been addressed in the current repository. GPT-5.6-Luna at xhigh implemented the editor and translation work. The parent integrated data, study and presentation fixes, reviewed the implementation, and completed validation. The user stopped the Sol advisor before advice was received; no Sol guidance was used. Luna's editor and independent re-review tasks later reached their usage limit, so the parent completed the remaining work. This is not a claim that the interrupted independent re-review completed.

During implementation the shared checkout moved from `feature/b1-c2-longdo-pairs` to `fix/architecture-review-fixes`, and commit `21c6d9b` incorporated the working changes along with another task's architecture work. That commit was not created by this task. The latest fixes and validation apply to the current combined checkout, without reverting those concurrent changes or changing branch references.

## Changes

| Finding | Resolution |
| --- | --- |
| CR-01: stale translation | Responses must match both request generation and current word. Changing a bilingual front clears its old answer and invalidates pending results; manual edits and candidate selections also invalidate older requests. Save checks answer/word association. |
| CR-02: existing answers replaced on open | Loaded answers are protected from automatic lookup. Editing only the level keeps the existing answer. Explicit lookup remains available. |
| WR-01: CEFR fallback ordering | The shared scope filter runs before Continue queue selection. |
| WR-02: proxy resource budgets | Bounded success/negative caches, request and upstream budgets, concurrency limits, in-flight deduplication, streamed body cap, and fetch/body timeout cleanup. The combined checkout's client fairness map is now also capacity-bounded, including for spoofed unique forwarded headers. Limits remain per instance. |
| WR-03: incomplete legacy levels | A1–C2 suffixes normalize through one shared helper. Existing A1/A2 levels remain displayable/editable, while the fresh seed remains B1–C2. |
| WR-04: false bilingual labels | Preview, study, quiz, rows and generic-card editor labels distinguish generic cards from explicit bilingual pairs. Editing an existing generic question preserves its answer and does not start automatic translation. |
| WR-05: phrase truncation | Parser retains complete headwords such as `take off`. |
| WR-06: retry scope | Missed-card retries reapply current deck and CEFR scope to freshly loaded cards. |
| WR-07: metadata validation | Shared validation covers loaded snapshots, writes, updates and restores; malformed optional metadata is rejected before rendering. |
| WR-08: strict lint failure | Removed unused seed filter bindings; strict lint passes. |
| WR-09: duplicate seed tuples | Removed 89 exact duplicates from source arrays. All 2,911 remaining tuples are unique. Existing saved cards, IDs and schedules are not deduplicated or reseeded. |
| WR-10: misleading practice link | With no due cards, “Practice all terms” opens explicit all-term mode. |
| WR-11: stale deck details | Storage/change events, visibility and a minute timer refresh the deck snapshot. Typed form state is retained, and own writes reread the authoritative card list rather than append duplicates. |

The parent also completed generic-editor labels after browser testing and made “No level” remove an existing level instead of silently retaining it.

## Automated verification

- 54 tests passed across the existing suites and new editor, metadata, queue, parser and resource-budget cases.
- Strict ESLint passed with zero warnings.
- Production build and its type validation passed.
- The five offline probes in `reviews/verify-findings.test.cjs` now assert the corrected behavior rather than the original defects.
- Test, lint and build output are retained in `reviews/fix-tests.log`, `reviews/fix-lint.log` and `reviews/fix-build.log`.

Browser and live integration evidence is recorded separately in `reviews/browser-checks.md`. The original agent reports and REVIEW.md remain historical review evidence, not the current release verdict.

## Production limits

The reviewed code blockers are resolved. This is not a certification of a deployed environment. Global protection across replicas still needs host/edge controls; a per-process limiter cannot provide that guarantee. Dictionary HTML remains an external integration that can change. Browser-only persistence remains subject to the project's documented limits. No deployment or push was performed by this task.
