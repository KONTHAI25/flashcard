# Narrow-viewport overflow: review record

Review date: 2026-09-17. Branch: `fix/mobile-nav-overflow`, base `main` at `bed3e7e`.
Commits on this branch: `0fc5ad2` (nav fix), `fa87727` (regression guard + round-1
refinements), `42b6ef2` (honest overflow assertions, plus the same `innerWidth` ->
`documentElement.clientWidth` correction in the flashcards and icon specs), `38c586b`
(round-2 refinements), then the round-3 commits `fix(shell)`, `fix(match)`, `fix(quiz)`,
`test(e2e)` and this record (`git log --oneline main..HEAD`).

## Defects found and fixed

1. **Mobile nav (the original report).** The four-item bar was a flex row whose links
   kept the default `min-width: auto`, so the row could not shrink below its
   min-content width (icon + gap + longest word + padding = ~383px). It pushed the
   document 15px wider than a 360px viewport and 55px wider than a 320px one; the
   412px Pixel 7 project passed with ~37px of slack, which is why the existing suite
   missed it.
2. **`/match` set list.** The single implicit `auto` track of `ul.match-deck-list`
   took its floor from the row's min-content width, so a set whose name was long
   pushed the document **315px** wide at 320px (and 275px at 360px) whenever the set
   was playable (a long-named set with fewer than two pairs is not listed, which is
   why a first probe missed it).
3. **`/quiz/[id]` choices.** A choice rendered as `<span className="flex-1">` kept
   `min-width: auto`, so a long unbroken answer forced the page **87px** wide at
   320px (47px at 360px).

## Fixes

`app/globals.css`: the nav rules inside the existing media blocks, one new
`forced-colors` block, and one new list rule.

- `<=800px`: the nav becomes `grid-auto-flow: column` with
  `grid-auto-columns: minmax(0, 1fr)` and `min-width: 0` on every link; label spans
  are clamped with `max-width: 100%; overflow: hidden; overflow-wrap: anywhere`.
  Labels wrap rather than truncate, so a long or localized destination stays readable.
- `<=560px`: padding and an 11.5px label size tuned for the row layout.
- `<=470px`: icon above label with a 52px tap target; the label keeps the full column
  width instead of wrapping under a row that is only ~101-112px wide.
- `forced-colors: active`: the current page is outlined, because that mode replaces
  the active pill's background.
- `.match-deck-list > li { min-width: 0 }`.

`app/quiz/[id]/page.tsx`: the choice label is now `min-w-0 flex-1 break-words`, so a
long answer shrinks and wraps inside the button.

## Review rounds

- **Round 1** (four reviewers: quality, test coverage, correctness, adversarial).
  Applied: `:where()` scoping so the mobile rules do not outrank anything
  unexpectedly, clamped label spans, removal of dead declarations, honest overflow
  assertions (`documentElement.clientWidth` instead of `innerWidth`, which Blink
  widens to content width under mobile emulation), and the regression spec.
- **Round 2** (seven reviewers on `muse-spark-1.3-contributor` at `xhigh`: cascade,
  tests, quality, adversarial, tech debt, scope/`AGENT.md`, accessibility). Applied:
  inert `text-overflow: ellipsis` removed from the wrapping rule; the label's
  redundant `min-width: 0` removed; the narrow-mode label override deleted, so no
  label is ever silently truncated; the stacked-layout switch moved from 430px to
  470px, removing the 431-449px band where the row layout wrapped two labels onto a
  second line and made the bar taller than the stack; comments corrected.
- **Round 3** (verification loop over the follow-up). The new page-level overflow
  test failed immediately on `/match` and exposed defect 2 above, which round 2 had
  wrongly recorded as non-reproducible; a route sweep then exposed defect 3.

## Tests

`tests/e2e/shell-nav.spec.ts` now guards:

- the nav at 320/360px and on a study route: layout viewport pinned, no document
  overflow, exactly the shipped labels, one row, per-label containment and clipping,
  tap targets >=44px in both axes, icons drawn, exactly one `aria-current` with a
  highlight and no highlight on the rest;
- both sides of the 470/471px layout switch through the same guard set, plus the
  switch itself: the link's computed `flex-direction` must be `column` at 470px and
  `row` at 471px, and no shipped label may be painted on more than one line on either
  side (so moving the breakpoint back, or a font change that wraps a label in the row
  layout, fails instead of passing quietly);
- a long unbroken destination label at 320px: no page overflow, no clipping, no spill
  outside the link, tap target intact;
- the desktop sidebar keeping its own metrics at 1024px (14px / 48px / `10px 15px` /
  13px gap / label `overflow: visible`) with the mobile nav hidden;
- the current page staying marked in `forced-colors: active`;
- no horizontal page scroll at 320px on `/`, `/study`, `/quiz`, `/match`, `/study/all`,
  `/deck/[id]`, a study session, a quiz session and a match session, with a long deck
  name and an unbroken answer as the content.

## Evidence

All viewport numbers below were measured on Windows Chromium against a production
build with the default Windows font stack; Linux CI uses different fallback fonts and
has not been measured here (see Known gaps).

- `npm run verify` green (lint, typecheck, 83 unit tests, production build).
- Falsification: with `main`'s `globals.css` and this spec, the nav guards fail on
  "horizontal page overflow" with `documentElement.scrollWidth = 375` at a 320px
  viewport (6 of the 8 cases at the time of the first run), the layout-switch test
  fails on a 42px link height, the forced-colours test fails on the missing outline
  rule, and the `/match` page-scroll case fails on the list track's min-content floor.
- Width matrix on `/`: `scrollWidth == clientWidth`, no label clipped, no label
  wrapped and every link at least 44x44px at 280, 300, 320, 340, 360, 375, 390, 412,
  430, 440, 450, 460, 470, 471, 480, 500, 560, 700 and 800px; the mobile nav is
  `display: none` at 801px (so the zero-sized links there are expected).
- Layout switch: 431/450/465/470px give 52px stacked links with one line per shipped
  label; 471/475px give 44px row links with one line per label. The row layout wrapped
  two labels at 431px and 435px and fitted from 450px, which is why the switch sits at
  470px rather than at the first width that happens to fit.
- Hostile labels at 320/360/420/470px (a 43-character German compound, a Thai phrase,
  a 40-character unbroken token, an empty label, and a fifth destination): no document
  overflow, no clipping and no spill outside the link at any of them; the long ones
  wrap onto 2-4 lines and grow the bar, and the fifth destination still forms a single
  row of five equal columns (distinct link tops = 1, equal widths, no clipping) at
  280, 320, 470 and 471px.
- Route sweep at 280px, 320px and 360px with a long deck name and an unbroken answer:
  `/`, `/study`, `/study/all`, `/quiz`, `/match`, `/deck/[id]`, `/study/[id]`,
  `/match/[id]` and `/quiz/[id]` all report zero horizontal overflow (27 anchored
  measurements). Each route waits for its own content anchor; `/study` uses the page
  heading there because its set-name span is only 4px wide at 280px and the text
  anchor does not resolve.
- Forced colours: the current link computes `solid 2px rgb(0, 0, 159)` with
  `outline-offset: -2px` and the others `none`, in both the mobile nav at 320px and
  the sidebar at 1024px.
- Desktop sidebar at 801/1024/1280px: 14px font, 48px min-height, `10px 15px`
  padding, 13px gap, every label `overflow: visible` with zero clipped width, mobile
  nav `display: none`.
- A simulated 16px browser minimum font size leaves the document at
  `scrollWidth == clientWidth` with no clipped label at 320/360/412/471/560px; the
  labels wrap and the bar grows to 86px at 320px instead of truncating. Re-run with
  Blink's real setting (`--blink-settings=minimumFontSize=16,minimumLogicalFontSize=16`):
  labels compute 16px, two of them wrap to two lines at 320px, the bar is 86px tall,
  and there is still no clipping and no document overflow at 320/360/412/560px.

## Known gaps

- All measurements above come from Windows Chromium with the default Windows font
  stack. CI runs Linux Chromium, whose fallback faces are wider; nothing in this
  record was re-measured there. At 320px the widest nav label has 14.5px of headroom
  (60px of text in a 74.5px link), so a ~7% wider face still fits, and a wider face
  would wrap the label rather than overflow or clip.
- Nav label sizes are `px` (12 / 11.5 / 10.5), so they ignore a user's font-size
  preference. With Blink's minimum font size set to 16px the labels wrap, the bar
  grows to 86px at 320px and nothing overflows or clips, so the cost is a taller bar
  rather than unreadable or hidden text.
- `/study/[id]`, `/match/[id]` and `/quiz/[id]` get the page-level overflow check
  (the two session routes through the spec's route list) but not the full nav guard
  set, which stays on `/` and one study route.
- `redesign/app-wide-premium` contains a second, independent nav overflow fix;
  whichever branch survives should keep one implementation.
