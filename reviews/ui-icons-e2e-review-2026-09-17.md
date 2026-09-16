# UI icon review and browser E2E implementation

Review date: 2026-09-17. Branch: `feature/ui-icons` at `5656d6d`.
Comparison: `main...feature/ui-icons`, with main at `5361eac`.

## Icon branch review

No new functional defect was identified in the icon changes. The review covered
the shared `Icon` component, glyph mappings, CSS, five PNG masks, source badges,
library mode illustrations, match-page changes, and attribution records.

The font and rendered masks load from the local production server. Browser
checks confirm that the font loads, glyph content is present, visible masks
decode with both transparent and opaque pixels, and the library makes no
external asset requests. Controls retain accessible names independent of
decorative icons. Desktop artwork was visually inspected; existing CSS hides
the large mode illustrations at mobile widths. The E2E suite captures both
viewport screenshots and checks horizontal overflow. This is not a legal
verification of the third-party asset licenses or pixel-level icon comparison.

The branch forked before main's bug-fix commit `d783f0a`. The existing dirty
workspace supplies those three reviewed fixes and their regression tests.
Integrate main before publishing this feature; those fixes should not be lost.

## Existing issue exposed by E2E

**P2: intermittent production hydration mismatch.** Uncaught React error #418
occurs during some library loads/reloads and study-route loads. User interactions
may still complete after React recovers, but a passing functional assertion
must not conceal the browser error.

Reproduction: build the production app, run the library persistence/remaining
flow in a fresh Chromium context, then navigate or reload. The browser reports:

```text
Minified React error #418
```

This also reproduced on clean main `5361eac` in a separate worktree/server:
one of three baseline library-flow executions failed solely on this error.
Subsequent baseline executions sometimes passed, confirming intermittency.
The icon branch is therefore not the introducing change.

Temporary instrumentation of the generated React bundle located the mismatch
at the root layout's `main` fiber, with `body` and `html` ancestors; the server's
`main#main-content` element was still present. This narrows investigation but
does not establish the underlying cause. Instrumentation was removed and the
production bundle rebuilt before final verification. No React errors are
suppressed by the delivered tests. The hydration issue remains unresolved.

## Delivered tests and CI

- Playwright 1.63.0 in the lockfile; production server lifecycle owned by the
  runner on loopback port 3100, with no server reuse.
- Nine scenarios in desktop Chromium and Pixel 7 Chromium emulation (18 cases):
  fresh seeding/deletion; library search/list/remaining routing; creation,
  editing, deletion and Undo; shuffle/grading identity; failed Undo retry;
  quiz keyboard/completion; match mismatch/completion/replay; backup
  export/import/rejection; local icon assets and layout.
- Fresh browser contexts with version-1 localStorage fixtures. Translation
  requests are intercepted. Storage fault injection affects one test browser
  and one write; no real user data is used.
- CI retains the existing lint/type/unit/build gate, installs Chromium and
  Linux browser dependencies, runs E2E, and uploads reports for seven days.
  Token permissions are explicitly read-only. Browser errors fail the suite.
- Diagnostic screenshots/videos on failure, first-retry CI traces, and an HTML
  report. Local trace capture is available explicitly. No new CI run has been
  published as part of this review.

See [`tests/e2e/README.md`](../tests/e2e/README.md) for commands and coverage.
The suite covers Chromium and emulated mobile viewports, not real devices,
Firefox, WebKit, or live Longdo availability.

## Verification scope

Local runs use Node 24.15.0 with the updated npm lockfile. Verification targets
the icon working tree plus the pre-existing local bug fixes, not the bare
`5656d6d` tree. Final results:

- `npm run verify`: **PASS**, lint, typecheck, **83/83 unit tests**, and the
  production build.
- `npm run test:e2e:run`: **FAIL**, **17 passed / 1 failed** in 20.4 seconds,
  with no local retries. The desktop icon case passed its asset/layout
  assertions but failed fixture teardown because React reported the inherited
  hydration error. All mobile cases passed in this run.
- `git diff --check`: passed.

The HTML report is generated at `playwright-report/index.html`; the failing
case's screenshot, video, and error context are under
`test-results/icons-local-icon-font-and--da78e-r-without-external-requests-desktop-chromium/`.
These generated files are intentionally untracked. The E2E gate is not green;
resolve the hydration issue rather than repeatedly rerunning until it passes.

Only E2E/configuration/documentation files were edited for this request.
Existing application fixes and unrelated exam-monitor files were preserved.
No merge, commit, or push was performed.
