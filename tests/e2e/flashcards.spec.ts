import { readFile } from "node:fs/promises";
import { test, expect, savedSnapshot } from "./fixtures";

test.describe("fresh browser", () => {
  test.use({ snapshot: null });
  test("seeds once and does not restore a deleted set after reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".set-card").first()).toBeVisible();
    const initial = await savedSnapshot(page);
    expect(initial.decks.length).toBeGreaterThan(1);
    await page.getByRole("searchbox", { name: "Search sets" }).fill(initial.decks[0].name);
    await page.getByRole("button", { name: `Delete ${initial.decks[0].name}`, exact: true }).click();
    await expect.poll(async () => (await savedSnapshot(page)).decks.length).toBe(initial.decks.length - 1);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Good things take practice." })).toBeVisible();
    expect((await savedSnapshot(page)).decks.some(deck => deck.id === initial.decks[0].id)).toBe(false);
  });
});

test("library search, view controls, and remaining-card link work", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search sets" }).fill("missing-set");
  await expect(page.getByRole("heading", { name: "No matching sets" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search sets" }).fill("E2E");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
  const remain = page.getByRole("link", { name: "Remain 1/4 still learning · play again", exact: true });
  if (isMobile) expect((await remain.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Compare against the layout viewport: Blink widens `window.innerWidth` to
  // the content width under mobile emulation, which hides real overflow.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await remain.click();
  await expect(page).toHaveURL(/\/study\/e2e-deck\?mode=learning$/);
  await expect(page.getByRole("combobox", { name: "Flashcard selection" })).toHaveValue("learning");
  const prompt = page.locator('button[aria-controls="study-answer"]');
  await expect(prompt).toContainText("cat");
  await prompt.click();
  await expect(page.locator("#study-answer")).toContainText("แมว");
  await page.getByRole("button", { name: "Know (press 2)", exact: true }).click();
  await expect(page.getByRole("button", { name: "Study all terms again" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await expect(page.locator(".set-remain")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".set-remain")).toHaveCount(0);
  expect((await savedSnapshot(page)).cards.find(card => card.id === "e2e-cat")!.streak).toBe(1);
});

test("create, edit, delete and undo persist through reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Make it yours/ }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Set name" }).fill("Created in E2E");
  await dialog.getByRole("button", { name: "Create set", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Created in E2E", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add term", exact: true }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.locator("#card-front").fill("river");
  await dialog.locator("#card-back").fill("แม่น้ำ");
  await dialog.getByRole("button", { name: "Add term", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit term: river", exact: true }).click();
  await dialog.locator("#card-back").fill("ลำน้ำ");
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Delete term: river", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit term: river", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit term: river", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^ลำน้ำ$/ })).toBeVisible();
  expect((await savedSnapshot(page)).cards.find(card => card.front === "river")!.back).toBe("ลำน้ำ");
});

test("shuffle keeps the revealed card as the grading target", async ({ page }) => {
  await page.goto("/study/e2e-deck?mode=all");
  const prompt = page.locator('button[aria-controls="study-answer"]');
  await expect(prompt).toBeVisible();
  const word = await prompt.locator("[data-study-word]").innerText();
  await prompt.click();
  const answer = await page.locator("#study-answer").textContent();
  const before = await savedSnapshot(page);
  await page.getByRole("button", { name: "Shuffle", exact: true }).click();
  await expect(prompt).toContainText(word);
  await expect(page.locator("#study-answer")).toHaveText(answer!);
  expect(await savedSnapshot(page)).toEqual(before);
  await page.getByRole("button", { name: "Know (press 2)", exact: true }).click();
  const after = await savedSnapshot(page);
  const changed = after.cards.filter(card => JSON.stringify(card) !== JSON.stringify(before.cards.find(old => old.id === card.id)));
  expect(changed.map(card => card.front)).toEqual([word]);
});

test("failed Undo preserves data and remains retryable", async ({ page, snapshot }) => {
  await page.goto("/deck/e2e-deck");
  await page.getByRole("button", { name: "Delete term: cat", exact: true }).click();
  const deleted = await savedSnapshot(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failNextWrite = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === "fc_storage" && failNextWrite) {
        failNextWrite = false;
        throw new DOMException("Test storage quota exhausted", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not undo. Please try again." }))
    .toHaveText("Could not undo. Please try again.");
  expect(await savedSnapshot(page)).toEqual(deleted);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit term: cat", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Edit term: cat", exact: true })).toBeVisible();
  expect((await savedSnapshot(page)).cards.find(card => card.id === "e2e-cat"))
    .toEqual(snapshot!.cards.find(card => card.id === "e2e-cat"));
});

test("quiz ignores navigation keys and completes with correct choices", async ({ page, snapshot }) => {
  await page.goto("/quiz/e2e-deck");
  const question = page.getByRole("heading", { level: 2 });
  await expect(question).toContainText("Question 1 of 4");
  const before = await savedSnapshot(page);
  await question.focus();
  for (const key of ["ArrowLeft", "ArrowRight", "Backspace", "Delete"]) await page.keyboard.press(key);
  expect(await savedSnapshot(page)).toEqual(before);
  await expect(page.getByRole("progressbar", { name: "Questions answered" })).toHaveAttribute("aria-valuenow", "0");
  for (let index = 0; index < 4; index++) {
    await expect(question).toContainText(`Question ${index + 1} of 4`);
    const text = await question.innerText();
    const card = snapshot!.cards.find(card => text.endsWith(card.front))!;
    expect(card).toBeTruthy();
    const options = page.getByRole("group", { name: `Answer choices for question ${index + 1}` }).getByRole("button");
    const choices = await options.allTextContents();
    const correctIndex = choices.findIndex(choice => choice.includes(card.back));
    expect(correctIndex).toBeGreaterThanOrEqual(0);
    await question.focus();
    await page.keyboard.press(String(correctIndex + 1));
    await expect(page.getByRole("progressbar", { name: "Questions answered" })).toHaveAttribute("aria-valuenow", String(index + 1));
    await page.getByRole("button", { name: index === 3 ? "See results" : "Next", exact: true }).click();
  }
  await expect(page.getByRole("status", { name: "Quiz complete. Scored 4 out of 4, 100 percent.", exact: true })).toBeVisible();
  expect((await savedSnapshot(page)).cards.every(card => card.streak >= 1)).toBe(true);
});

test("match handles a wrong pair, completes and replays without changing schedules", async ({ page, snapshot }) => {
  await page.goto("/match/e2e-deck");
  await page.getByRole("button", { name: "English: cat", exact: true }).click();
  await page.getByRole("button", { name: "Thai: สุนัข", exact: true }).click();
  await expect(page.getByText("Not a pair. Try again", { exact: true })).toBeAttached();
  await expect(page.locator(".is-mistake")).toHaveCount(0);
  for (const card of snapshot!.cards) {
    await page.getByRole("button", { name: `English: ${card.front}`, exact: true }).click();
    await page.getByRole("button", { name: `Thai: ${card.back}`, exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Nice work!" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Board cleared with 80% accuracy" })).toBeVisible();
  expect(await savedSnapshot(page)).toEqual(snapshot);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.getByRole("button", { name: /^English:/ })).toHaveCount(4);
});

test("backup download restores data and invalid import preserves it", async ({ page, snapshot }) => {
  await page.goto("/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup", exact: true }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup).toEqual(snapshot);
  await page.getByRole("button", { name: "Delete E2E vocabulary", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your first set starts here" })).toBeVisible();
  page.on("dialog", dialog => dialog.accept());
  const file = page.getByLabel("Import backup file");
  await file.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole("heading", { name: "E2E vocabulary", exact: true })).toBeVisible();
  await file.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":999}') });
  await expect(page.getByText("Import: unsupported snapshot version.", { exact: true })).toBeVisible();
  expect(await savedSnapshot(page)).toEqual(snapshot);
});
