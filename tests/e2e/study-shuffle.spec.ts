import { sampleSnapshot, savedSnapshot, test, expect } from "./fixtures";

test("shuffle changes the hidden card, restores order, and reviews each card once", async ({ page }) => {
  await page.goto("/study/e2e-deck?mode=all");
  const prompt = page.locator('button[aria-controls="study-answer"]');
  const word = prompt.locator("[data-study-word]");
  const shuffle = page.getByRole("button", { name: "Shuffle", exact: true });
  await expect(prompt).toBeVisible();
  const original = await word.innerText();
  const before = await savedSnapshot(page);
  // An identity random draw must still change the first eligible card.
  await page.evaluate(() => { Math.random = () => 0.999; });
  await shuffle.click();
  await expect(shuffle).toHaveAttribute("aria-pressed", "true");
  await expect(word).not.toHaveText(original);
  expect(await savedSnapshot(page)).toEqual(before);
  await shuffle.click();
  await expect(shuffle).toHaveAttribute("aria-pressed", "false");
  await expect(word).toHaveText(original);
  expect(await savedSnapshot(page)).toEqual(before);

  await shuffle.click();
  const seen: string[] = [];
  for (let index = 0; index < before.cards.length; index++) {
    await expect(prompt).toHaveAttribute("aria-expanded", "false");
    seen.push(await word.innerText());
    await prompt.click();
    // Turn Shuffle off after grading has begun, while preserving a revealed card.
    if (index === 1) {
      await shuffle.click();
      await expect(word).toHaveText(seen[index]);
    }
    await page.getByRole("button", { name: "Know (press 2)", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Session complete", exact: true })).toBeVisible();
  expect(seen.sort()).toEqual(before.cards.map(card => card.front).sort());
});

test.describe("two-card shuffled round", () => {
  const snapshot = sampleSnapshot();
  snapshot.cards = snapshot.cards.slice(0, 2);
  test.use({ snapshot });

  test("retains shuffled order when a filter remounts the round", async ({ page }) => {
    await page.goto("/study/e2e-deck?mode=all");
    const prompt = page.locator('button[aria-controls="study-answer"]');
    const word = prompt.locator("[data-study-word]");
    await expect(prompt).toBeVisible();
    const original = await word.innerText();
    const before = await savedSnapshot(page);
    await page.getByRole("button", { name: "Shuffle", exact: true }).click();
    await expect(word).not.toHaveText(original);
    await page.getByRole("combobox", { name: "CEFR level" }).selectOption("B1");
    await expect(prompt).toBeVisible();
    await expect(word).not.toHaveText(original);
    await expect(page.getByRole("button", { name: "Shuffle", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await savedSnapshot(page)).toEqual(before);
  });
});
