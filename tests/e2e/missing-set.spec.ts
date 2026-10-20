import { test, expect } from "./fixtures";

test("an unknown set redirects without flashing a completed round", async ({ page }) => {
  // Record any summary heading rendered before the redirect lands.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __summaryFlash: string[] }).__summaryFlash = seen;
    new MutationObserver(() => {
      for (const heading of document.querySelectorAll("h1")) {
        const text = heading.textContent ?? "";
        if (/Session complete|Round complete|Nothing to review/.test(text)) seen.push(text);
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });

  await page.goto("/study/no-such-set");
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByRole("heading", { name: "Flashcards", level: 1 })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __summaryFlash: string[] }).__summaryFlash)).toEqual([]);
});
