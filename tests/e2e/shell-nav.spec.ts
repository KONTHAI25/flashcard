import { expect, type Locator, type Page } from "@playwright/test";
import { sampleSnapshot, test } from "./fixtures";

/**
 * Regression guard for the shell navigation.
 *
 * Before the fix the four-item mobile nav was a flex row whose items kept the
 * default `min-width: auto`, so the row could not shrink below a 383px
 * min-content width (icon + gap + longest word + padding) and pushed the
 * document 15px wider than a 360px screen and 55px wider than a 320px one.
 * The Pixel 7 project (412px) passed by ~37px, which is why this needs its own
 * width matrix rather than one mobile viewport.
 */

const PHONE_WIDTHS = [320, 360] as const;
// Mirrors the destinations in components/Header.tsx; update both together.
const LABELS = ["Your library", "Flashcards", "Practice quiz", "Find the pair"];

/** Geometry of the visible mobile nav, measured in the page. */
async function auditMobileNav(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector(".mobile-nav");
    if (!nav) throw new Error("the mobile nav is not rendered");
    const viewport = document.documentElement.clientWidth;
    const links = [...nav.querySelectorAll<HTMLElement>(".shell-nav-link")].map(link => {
      const label = link.querySelector<HTMLElement>("span:not(.fc-icon)");
      if (!label) throw new Error("a nav link lost its label span");
      const icon = link.querySelector<HTMLElement>(".fc-icon");
      if (!icon) throw new Error("a nav link lost its icon");
      const linkRect = link.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      // Measure the painted text, not just the box: `overflow: hidden` can clip
      // a label while the document stays perfectly scroll-free.
      return {
        text: label.textContent ?? "",
        labelOutsideLink: Math.max(labelRect.right - linkRect.right, linkRect.left - labelRect.left, 0),
        linkOutsideViewport: Math.max(linkRect.right - viewport, 0),
        // Element-level overflow: stays 0 for a label that wraps to a second
        // line (legitimate) and goes positive when text is hard-clipped, which
        // the document-level check cannot see.
        textClippedBy: Math.max(label.scrollWidth - label.clientWidth, 0),
        // A missing or unloaded glyph would shrink the icon to nothing while
        // every text assertion still passes.
        iconWidth: iconRect.width,
        iconHeight: iconRect.height,
        top: linkRect.top,
        height: linkRect.height,
        width: linkRect.width,
        active: link.getAttribute("aria-current") === "page",
        background: getComputedStyle(link).backgroundColor,
      };
    });
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      links,
    };
  });
}

/** Computed main-axis direction of the nav links, which is what the layout switch flips. */
async function navLinkDirection(page: Page) {
  return page.locator(".mobile-nav .shell-nav-link").first().evaluate(link => getComputedStyle(link).flexDirection);
}

/** Labels painted on more than one line, measured against their own line box. */
async function wrappedLabels(page: Page) {
  return page.locator(".mobile-nav").evaluate(nav =>
    [...nav.querySelectorAll<HTMLElement>(".shell-nav-link > span:not(.fc-icon)")]
      .filter(label => {
        const style = getComputedStyle(label);
        const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize);
        return label.getBoundingClientRect().height > lineHeight * 1.25;
      })
      .map(label => label.textContent ?? ""));
}

async function expectNavFits(page: Page, where: string, expectedWidth: number, activeLabel = "Your library") {
  await page.evaluate(() => document.fonts.ready);
  const audit = await auditMobileNav(page);
  // A widened layout viewport (meta-viewport regression) would make every
  // overflow assertion below pass while the page is effectively zoomed out.
  expect(audit.viewport, `${where}: layout viewport`).toBeLessThanOrEqual(expectedWidth);
  expect(audit.viewport, `${where}: layout viewport`).toBeGreaterThan(expectedWidth - 20);
  expect(audit.scrollWidth, `${where}: horizontal page overflow`).toBeLessThanOrEqual(audit.viewport);
  expect(audit.links.map(link => link.text), `${where}: nav labels`).toEqual(LABELS);
  // One row for every destination: guards the grid tracks against collapsing
  // into a wrapped second row.
  expect(new Set(audit.links.map(link => Math.round(link.top))).size, `${where}: links share one row`).toBe(1);
  for (const link of audit.links) {
    expect(link.labelOutsideLink, `${where}: "${link.text}" label inside its link`).toBeLessThanOrEqual(1);
    // 1px of slack absorbs subpixel rect rounding on fractional grid tracks.
    expect(link.linkOutsideViewport, `${where}: "${link.text}" inside the viewport`).toBeLessThanOrEqual(1);
    expect(link.textClippedBy, `${where}: "${link.text}" text not clipped`).toBeLessThanOrEqual(1);
    expect(link.height, `${where}: "${link.text}" tap target height`).toBeGreaterThanOrEqual(44);
    expect(link.width, `${where}: "${link.text}" tap target width`).toBeGreaterThanOrEqual(44);
    expect(link.iconWidth, `${where}: "${link.text}" icon drawn`).toBeGreaterThan(0);
    expect(link.iconHeight, `${where}: "${link.text}" icon drawn`).toBeGreaterThan(0);
  }
  const active = audit.links.filter(link => link.active);
  expect(active.map(link => link.text), `${where}: exactly one current link`).toEqual([activeLabel]);
  expect(active[0].background, `${where}: active highlight`).not.toBe("rgba(0, 0, 0, 0)");
  for (const link of audit.links.filter(link => !link.active)) {
    expect(link.background, `${where}: "${link.text}" is not highlighted`).toBe("rgba(0, 0, 0, 0)");
  }
}

for (const width of PHONE_WIDTHS) {
  test(`mobile nav fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
    await expectNavFits(page, `/ @${width}px`, width);
  });
}

test("mobile nav fits on a study route too", async ({ page }) => {
  const width = 320;
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/study/e2e-deck?mode=learning");
  await expect(page.getByRole("combobox", { name: "Flashcard selection" })).toBeVisible();
  await expectNavFits(page, `/study/e2e-deck @${width}px`, width, "Flashcards");
});

test("the nav switches layout at 470px without clipping", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  const navHeight = () => page.locator(".mobile-nav").evaluate(nav => nav.getBoundingClientRect().height);
  await page.setViewportSize({ width: 470, height: 900 });
  // Both sides of the switch get the full guard set: a second row, a shrunken
  // tap target or a widened layout viewport is as wrong here as at 320px.
  await expectNavFits(page, "/ @470px", 470);
  const stackedHeight = await navHeight();
  // Pin the switch itself: moving the breakpoint back to where the row layout
  // wraps a shipped label must fail here rather than pass quietly.
  expect(await navLinkDirection(page), "@470px: stacked layout").toBe("column");
  expect(await wrappedLabels(page), "@470px: shipped labels stay on one line").toEqual([]);
  await page.setViewportSize({ width: 471, height: 900 });
  await expectNavFits(page, "/ @471px", 471);
  const rowHeight = await navHeight();
  expect(await navLinkDirection(page), "@471px: row layout").toBe("row");
  // From 471px the row layout must hold every shipped label on one line; a font
  // or padding regression that wraps one belongs in the stacked layout instead.
  expect(await wrappedLabels(page), "@471px: shipped labels stay on one line").toEqual([]);
  // The stacked layout is taller by design (icon above label); it must stay a
  // bounded change rather than doubling the bar.
  expect(Math.abs(stackedHeight - rowHeight)).toBeLessThanOrEqual(14);
});

test("a long destination label wraps instead of widening the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>(".mobile-nav .shell-nav-link > span:not(.fc-icon)")[2].textContent = "Supercalifragilisticexpialidocious";
  });
  const audit = await auditMobileNav(page);
  const link = audit.links[2];
  expect(audit.scrollWidth, "long label: horizontal page overflow").toBeLessThanOrEqual(audit.viewport);
  expect(link.textClippedBy, "long label: not clipped").toBeLessThanOrEqual(1);
  expect(link.labelOutsideLink, "long label: inside its link").toBeLessThanOrEqual(1);
  expect(link.height, "long label: tap target height").toBeGreaterThanOrEqual(44);
  expect(link.width, "long label: tap target width").toBeGreaterThanOrEqual(44);
});

test("the desktop sidebar keeps its own metrics", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  const sidebar = await page.evaluate(() => {
    const link = document.querySelector<HTMLElement>(".sidebar .shell-nav-link");
    const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
    if (!link || !mobileNav) throw new Error("the shell navigation is incomplete");
    const style = getComputedStyle(link);
    const label = link.querySelector<HTMLElement>("span:not(.fc-icon)");
    if (!label) throw new Error("the sidebar link lost its label");
    return {
      fontSize: style.fontSize,
      minHeight: style.minHeight,
      padding: style.padding,
      gap: style.gap,
      labelOverflow: getComputedStyle(label).overflow,
      mobileNav: getComputedStyle(mobileNav).display,
    };
  });
  // The narrow-viewport rules must not leak into the fixed sidebar.
  expect(sidebar).toEqual({
    fontSize: "14px",
    minHeight: "48px",
    padding: "10px 15px",
    gap: "13px",
    labelOverflow: "visible",
    mobileNav: "none",
  });
});

test("the current page stays marked in forced-colors mode", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await page.emulateMedia({ forcedColors: "active" });
  const links = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".mobile-nav .shell-nav-link")].map(link => {
    const style = getComputedStyle(link);
    return {
      text: link.textContent ?? "",
      active: link.getAttribute("aria-current") === "page",
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  }));
  const active = links.filter(link => link.active);
  expect(active.map(link => link.text), "forced-colors: exactly one current link").toEqual(["Your library"]);
  // This mode replaces the active pill's background, so the outline is what is
  // left to tell the current page apart.
  expect(active[0].outlineStyle, "forced-colors: current link outlined").toBe("solid");
  expect(active[0].outlineWidth, "forced-colors: outline width").toBeGreaterThanOrEqual(2);
  for (const link of links.filter(candidate => !candidate.active)) {
    expect(link.outlineStyle, `forced-colors: "${link.text}" not outlined`).toBe("none");
  }
});

// Page-level guard for the defect class this file exists for: whatever the shell
// renders, the document must not scroll sideways at the narrowest phone width.
// The content is hostile on purpose - a long deck name and an unbroken answer
// are exactly where a min-content floor reappears.
const LONG_DECK_NAME = "Advanced conversational vocabulary for the autumn term";
const UNBREAKABLE_ANSWER = "Supercalifragilisticexpialidociousandthensomeletters";
const longNameSnapshot = (() => {
  const snapshot = sampleSnapshot();
  return {
    ...snapshot,
    decks: snapshot.decks.map(deck => ({ ...deck, name: LONG_DECK_NAME })),
    cards: snapshot.cards.map((card, index) => index === 0 ? { ...card, back: UNBREAKABLE_ANSWER } : card),
  };
})();

// The seed has to keep at least `MIN_QUIZ_ANSWERS` distinct answers and
// `MATCH_MIN_PAIRS` distinct pairs, otherwise these routes render an empty state
// instead of the content the measurement depends on (see `lib/match.ts`).
const OVERFLOW_ROUTES: { route: string; anchor: (page: Page) => Locator }[] = [
  { route: "/", anchor: page => visibleText(page, LONG_DECK_NAME) },
  { route: "/quiz", anchor: page => visibleText(page, LONG_DECK_NAME) },
  { route: "/match", anchor: page => visibleText(page, LONG_DECK_NAME) },
  { route: "/study", anchor: page => visibleText(page, LONG_DECK_NAME) },
  { route: "/study/all", anchor: page => page.getByRole("combobox", { name: "Flashcard selection" }) },
  { route: "/deck/e2e-deck", anchor: page => page.getByRole("heading", { name: LONG_DECK_NAME, exact: true }) },
  { route: "/study/e2e-deck?mode=learning", anchor: page => page.getByRole("combobox", { name: "Flashcard selection" }) },
  { route: "/match/e2e-deck", anchor: page => page.locator(".match-tile").first() },
  // The quiz session renders the unbroken answer as a choice.
  { route: "/quiz/e2e-deck", anchor: page => visibleText(page, UNBREAKABLE_ANSWER) },
];

/** First match that is actually visible; `.first()` alone can pick a hidden copy. */
function visibleText(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true }).first();
}

test.describe("no page scrolls sideways at 320px", () => {
  test.use({ snapshot: longNameSnapshot });
  for (const { route, anchor } of OVERFLOW_ROUTES) {
    test(`${route} has no horizontal page scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(route);
      await expect(anchor(page)).toBeVisible();
      // A late font swap would change the measured width, so settle first.
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route}: horizontal page overflow`).toBeLessThanOrEqual(1);
    });
  }
});
