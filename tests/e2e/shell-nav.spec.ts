import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

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
      const linkRect = link.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      // Measure the painted text, not just the box: `overflow: hidden` can clip
      // a label while the document stays perfectly scroll-free.
      const range = document.createRange();
      range.selectNodeContents(label);
      return {
        text: label.textContent ?? "",
        labelOutsideLink: Math.max(labelRect.right - linkRect.right, linkRect.left - labelRect.left, 0),
        linkOutsideViewport: Math.max(linkRect.right - viewport, 0),
        textClippedBy: Math.max(range.getBoundingClientRect().width - label.clientWidth, 0),
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

async function expectNavFits(page: Page, where: string, expectedWidth: number) {
  await page.evaluate(() => document.fonts.ready);
  const audit = await auditMobileNav(page);
  // A widened layout viewport (meta-viewport regression) would make every
  // overflow assertion below pass while the page is effectively zoomed out.
  expect(audit.viewport, `${where}: layout viewport`).toBeLessThanOrEqual(expectedWidth);
  expect(audit.viewport, `${where}: layout viewport`).toBeGreaterThan(expectedWidth - 20);
  expect(audit.scrollWidth, `${where}: horizontal page overflow`).toBeLessThanOrEqual(audit.viewport);
  expect(audit.links.map(link => link.text), `${where}: nav labels`).toEqual(LABELS);
  for (const link of audit.links) {
    expect(link.labelOutsideLink, `${where}: "${link.text}" label inside its link`).toBeLessThanOrEqual(1);
    expect(link.linkOutsideViewport, `${where}: "${link.text}" inside the viewport`).toBeLessThanOrEqual(0);
    expect(link.textClippedBy, `${where}: "${link.text}" text not clipped`).toBeLessThanOrEqual(1);
    expect(link.height, `${where}: "${link.text}" tap target height`).toBeGreaterThanOrEqual(44);
    expect(link.width, `${where}: "${link.text}" tap target width`).toBeGreaterThanOrEqual(44);
  }
  const active = audit.links.filter(link => link.active);
  expect(active.map(link => link.text), `${where}: exactly one current link`).toEqual(["Your library"]);
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
  await page.evaluate(() => document.fonts.ready);
  const audit = await auditMobileNav(page);
  expect(audit.scrollWidth, `/study/e2e-deck @${width}px: horizontal page overflow`).toBeLessThanOrEqual(audit.viewport);
});

test("the nav switches layout at 430px without clipping", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 430, height: 900 });
  const stacked = await auditMobileNav(page);
  await page.setViewportSize({ width: 431, height: 900 });
  const row = await auditMobileNav(page);
  for (const [width, audit] of [[430, stacked], [431, row]] as const) {
    expect(audit.scrollWidth, `@${width}px: horizontal page overflow`).toBeLessThanOrEqual(audit.viewport);
    for (const link of audit.links) {
      expect(link.textClippedBy, `@${width}px: "${link.text}" text not clipped`).toBeLessThanOrEqual(1);
      expect(link.linkOutsideViewport, `@${width}px: "${link.text}" inside the viewport`).toBeLessThanOrEqual(0);
    }
  }
  // The stacked layout is taller by design (icon above label); it must stay a
  // bounded change rather than doubling the bar.
  const navHeight = async () => page.locator(".mobile-nav").evaluate(nav => nav.getBoundingClientRect().height);
  await page.setViewportSize({ width: 430, height: 900 });
  const stackedHeight = await navHeight();
  await page.setViewportSize({ width: 431, height: 900 });
  const rowHeight = await navHeight();
  expect(Math.abs(stackedHeight - rowHeight)).toBeLessThanOrEqual(14);
});
