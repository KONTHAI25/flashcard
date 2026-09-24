import { savedSnapshot, test, expect } from "./fixtures";

test("typed answers need exact spelling and suggest the matching grade", async ({ page }) => {
  await page.goto("/study/e2e-deck?mode=all");
  const prompt = page.locator('button[aria-controls="study-answer"]');
  const word = prompt.locator("[data-study-word]");
  await expect(prompt).toBeVisible();
  const before = await savedSnapshot(page);
  const englishFor = new Map(before.cards.map(card => [card.back, card]));

  // Swap shows Thai first, so the typed answer is English.
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await page.getByRole("button", { name: "Type", exact: true }).click();
  const input = page.getByRole("textbox", { name: /^Type the (English )?answer$/ });
  await expect(input).toBeFocused();

  // One wrong letter is not correct ("woter" is not "water").
  const first = englishFor.get(await word.innerText())!;
  const typo = first.front.replace(/[aeiou]/, "o") === first.front ? `${first.front}x` : first.front.replace(/[aeiou]/, "o");
  await input.fill(typo);
  await input.press("Enter");
  await expect(page.locator("#study-answer")).toContainText("Not quite");
  await expect(page.locator("#study-answer")).toContainText(first.front);
  await page.getByRole("button", { name: "Continue · Still learning" }).click();
  expect((await savedSnapshot(page)).cards.find(card => card.id === first.id)!.streak).toBe(0);

  // Exact spelling passes; case and outer spaces are forgiven.
  await expect(prompt).toHaveAttribute("aria-expanded", "false");
  const second = englishFor.get(await word.innerText())!;
  await input.fill(`  ${second.front.toUpperCase()} `);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.locator("#study-answer")).toContainText("Correct");
  const next = page.getByRole("button", { name: "Continue · Know" });
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  expect((await savedSnapshot(page)).cards.find(card => card.id === second.id)!.streak).toBe(second.streak + 1);
});
