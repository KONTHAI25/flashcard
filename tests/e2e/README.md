# Browser E2E tests

These Playwright tests run against a local **production build** in desktop
Chromium and Chromium with Pixel 7 emulation. They use fresh browser contexts;
they never open a personal browser profile or an external deployment.

## Run locally

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

`test:e2e` builds the app, then starts and stops its own server at
`http://127.0.0.1:3100`. Keep port 3100 free. The suite refuses to reuse an
existing server, preventing tests from silently exercising an outdated build.

After a successful build, use `npm run test:e2e:run` to rerun tests without
rebuilding. Use `npm run test:e2e:ui` for the interactive runner, or select a
project/test:

```sh
npm run test:e2e:run -- --project=mobile-chromium
npm run test:e2e:run -- --grep "failed Undo"
npx playwright show-report
```

## Coverage and isolation

- Fresh-browser seeding and deletion persistence across reloads.
- Library search, list view, mobile overflow, and remaining-card routing.
- Set creation, term editing, deletion, Undo, and reload persistence.
- A simulated quota failure during Undo, followed by a successful retry.
- Mid-round shuffle preserving the revealed card and grading the correct card.
- Quiz navigation keys, numeric answers, score, and saved schedules.
- Incorrect and correct match pairs, completion, and replay.
- Backup download, restore, and rejection of invalid backups without data loss.
- Local icon font loading, decoded transparent masks, accessible controls,
  external-request detection, and desktop/mobile screenshot attachments.

Fixtures seed a small version-1 `fc_storage` snapshot once per browser context,
not on every navigation. Most actions use accessible roles and names. Direct
storage reads verify persistence; the one-write quota fault is injected only
inside its test browser. Translation calls are intercepted with a fixed
unavailable response, so tests do not depend on Longdo or consume its budget.

Uncaught browser errors fail tests, including recoverable React hydration
errors. Do not suppress those errors or add sleeps to hide failures. Desktop
and mobile projects run the same flows; emulation does not establish Safari,
Firefox, or physical-device coverage. Screenshots are diagnostic attachments,
not pixel-diff golden tests. Live translation and third-party license compliance
are outside this suite's scope.

The initial review found an intermittent hydration error on both the icon
working tree and clean main. See the [review and verification results](../../reviews/ui-icons-e2e-review-2026-09-17.md)
before treating an E2E failure as an icon regression.

## CI and diagnostics

The existing CI job runs `npm run verify`, installs Chromium with its Linux
dependencies, then runs `npm run test:e2e:run` against that build. Two workers
bound browser load. CI permits one retry and rejects `test.only`; local runs
have no retries. Inspect retried failures rather than treating them as proof
of reliability.

`playwright-report/` contains the HTML report. Failure screenshots and videos,
plus traces from the first CI retry, live in `test-results/`. Both directories
are ignored by Git and uploaded by CI for seven days. Capture a local trace
with `npm run test:e2e:run -- --trace on --grep "failed Undo"`. To inspect it:

```sh
npx playwright show-trace test-results/<failed-test>/trace.zip
```

Configuration follows Playwright's official guides for
[web servers](https://playwright.dev/docs/test-webserver),
[projects](https://playwright.dev/docs/test-projects), and
[CI](https://playwright.dev/docs/ci).
