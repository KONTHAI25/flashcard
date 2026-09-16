# Unmerged branch and CI review — 2026-09-17

## Scope

Fetched `origin` and reviewed `main...feature/set-card-remain-progress`.
The branch tip is `389fe232d065b7395a9adb19d27d7d188ce1ffb4`;
the merge base and local main are `dc80c57674fe66961692722e6a914dd06dede35b`.
The two branch commits change only `components/SetCard.tsx` and
`app/globals.css`. All other local branches are ancestors of main or equal to it.
The remote advertises only main at `1fcbd7a`; GitHub returned no open PRs.

The existing dirty checkout includes three UI fixes, agent-guide edits, an
untracked regression test, and unrelated exam-monitor files. Those changes were
preserved. No application code, workflow, branch tip, or remote was changed by
this review. This review updates only the guide and this report.

## Findings

### P2 — The remaining-card link opens a broader queue

Location: branch `components/SetCard.tsx:35`.

The chip derives its count from `summaryRemaining` (reviewed minus learned),
and its accessible label offers to replay still-learning cards. Its link opens
the plain `/study/[id]` route, which initializes `StudySession` in `continue`
mode. That queue includes every due card as well as still-learning cards.

Reproduction using the branch's actual `summarizeDecks`, `summaryRemaining`,
and `selectStudyCards` functions: a deck with one unstarted card, one missed
card scheduled in the future, and one learned card due now shows `Remain 1/3`.
The link's default mode selects all three; `learning` mode selects only the
missed card. Users cannot replay the displayed subset directly from this chip.

Pass an explicit learning mode through a supported route mechanism and add a
regression test for the destination. Merely appending a query parameter is
insufficient: `app/study/[id]/page.tsx` currently does not consume one.

### P2 — The new replay control misses the project's mobile target size

Location: branch `app/globals.css:250`.

`.set-remain` is a separate interactive link with 11 px text and no vertical
padding or minimum height. Its margins do not enlarge its hit area. The mobile
rules adjust margins but never provide the 44 px minimum used by `.set-study`
and required by the project guide. This makes the added replay action harder
to tap reliably on the project's primary mobile layout.

Give the link at least `min-height: 44px`, then check grid and list layouts at
mobile width, including keyboard focus. This finding is based on source review;
no browser layout measurement was performed.

## CI review

`.github/workflows/ci.yml` triggers on all pushes and pull requests, checks out
the event revision, installs Node 22, uses npm's download cache, runs `npm ci`,
and executes `npm run verify`. The script runs lint, typecheck, tests, and a
production build sequentially. Job timeout is 15 minutes; concurrency cancels
superseded runs for the same workflow/ref. CI has no deployment step.

No blocking execution defect was found in this workflow. Recommended hardening:
declare top-level `permissions: contents: read` explicitly instead of depending
on repository defaults. The current tests do not exercise browser navigation
or responsive hit areas, so a passing run does not resolve the findings above.
Branch-protection settings and Vercel configuration were not inspected.

The latest remote run completed successfully on main at
`1fcbd7a007fc5881f7bd4e386c2c159dfead46e2`:
[Actions run 35090918528](https://github.com/KONTHAI25/flashcard/actions/runs/35090918528).
That run does not validate the local branch or dirty checkout.

## Verification

- Unmerged branch, detached worktree: `npm run verify` passed lint, typecheck,
  71/71 tests, and the production build.
- Original dirty main checkout: `npm run verify` passed lint, typecheck,
  74/74 tests, and the production build. The additional tests cover existing
  local fixes for quiz keys, active-card shuffle, and retryable Undo failures.
- Both local checks used Node 24.15.0 and npm 12.0.2 with existing installed
  dependencies; the detached worktree used a junction to those dependencies.
  No fresh local `npm ci` or local Node 22 run was performed.
- Executed the mixed-deck queue reproduction described above against branch
  source. It confirmed one remaining card versus three cards in continue mode.

Resolve the two findings before merging. No merge, push, or CI rerun was requested
or performed.
