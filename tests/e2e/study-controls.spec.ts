import { sampleSnapshot, test, expect } from "./fixtures";

test.describe("study controls", () => {
  const snapshot = sampleSnapshot();
  snapshot.cards = snapshot.cards.map(card => ({ ...card, wordEng: card.front, wordThai: card.back }));
  test.use({ snapshot, viewport: { width: 320, height: 720 } });

  test("keeps grading actions readable at 320px and updates Swap direction", async ({ page }) => {
    await page.goto("/study/e2e-deck?mode=all");

    const prompt = page.locator('button[aria-controls="study-answer"]');
    const stillLearning = page.getByRole("button", { name: "Still learning (press 1)", exact: true });
    const know = page.getByRole("button", { name: "Know (press 2)", exact: true });

    const readLayout = () => page.evaluate(async () => {
      await document.fonts.ready;
      const buttons = [...document.querySelectorAll('button[aria-label^="Still learning"], button[aria-label^="Know"]')];
      const labels = [...document.querySelectorAll("button[aria-label^=\"Still learning\"] span, button[aria-label^=\"Know\"] span")]
        .filter((element) => element.textContent?.trim() === "Still learning" || element.textContent?.trim() === "Know");
      return {
        buttonCount: buttons.length,
        labelCount: labels.length,
        pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        buttonsFit: buttons.every((button) => {
          const box = button.getBoundingClientRect();
          return box.width >= 120 && box.height >= 44 && box.left >= 0 && box.right <= document.documentElement.clientWidth;
        }),
        labelsFit: labels.every((label) => label.scrollWidth <= label.clientWidth),
      };
    });

    await expect(prompt).toContainText(/English\s*→\s*Thai/);
    await expect(stillLearning).toBeDisabled();
    await expect(know).toBeDisabled();

    expect(await readLayout()).toEqual({ buttonCount: 2, labelCount: 2, pageFits: true, buttonsFit: true, labelsFit: true });

    await page.getByRole("button", { name: "Swap", exact: true }).click();
    await expect(prompt).toContainText(/Thai\s*→\s*English/);
    await prompt.click();
    await expect(page.locator("#study-answer")).toContainText("English · Answer");
    await expect(stillLearning).toBeEnabled();
    await expect(know).toBeEnabled();
    expect(await readLayout()).toEqual({ buttonCount: 2, labelCount: 2, pageFits: true, buttonsFit: true, labelsFit: true });

    const colors = await page.evaluate(() => {
      const still = document.querySelector('button[aria-label^="Still learning"]')!;
      const known = document.querySelector('button[aria-label^="Know"]')!;
      return [getComputedStyle(still).backgroundColor, getComputedStyle(known).backgroundColor];
    });
    expect(colors[0]).not.toBe(colors[1]);
  });
});
