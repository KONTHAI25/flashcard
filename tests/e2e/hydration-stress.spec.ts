import { expect, type Locator, type Page } from "@playwright/test";
import { test as fixtureTest } from "./fixtures";

// Regression guard for the intermittent React #418 hydration mismatch that
// used to fail teardown on desktop loads when hydration raced streamed RSC
// chunks under CPU load. Loading and reloading every shell route keeps the
// suite's uncaught-error gate (fixtures.ts) pointed at that recovery path.
// The defect was viewport-independent, so this runs desktop-only to bound CI.
fixtureTest.skip(({ isMobile }) => isMobile);

const settled: [route: string, ready: (page: Page) => Locator][] = [
  ["/", (page) => page.getByRole("heading", { name: "Good things take practice." })],
  ["/study", (page) => page.getByRole("heading", { name: "Flashcards" })],
  ["/study/all", (page) => page.getByRole("combobox", { name: "Flashcard selection" })],
  ["/study/e2e-deck?mode=learning", (page) => page.getByRole("combobox", { name: "Flashcard selection" })],
  ["/deck/e2e-deck", (page) => page.getByRole("button", { name: "Add term", exact: true }).first()],
];

fixtureTest.describe("hydration stress", () => {
  for (const [route, ready] of settled) {
    fixtureTest(`load and reload ${route} without uncaught errors`, async ({ page }) => {
      await page.goto(route);
      await expect(ready(page)).toBeVisible();
      await page.reload();
      await expect(ready(page)).toBeVisible();
    });
  }
});
