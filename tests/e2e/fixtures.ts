import { test as base, expect, type Page } from "@playwright/test";
import type { Card, Deck } from "../../lib/types";

export interface Snapshot { version: 1; decks: Deck[]; cards: Card[] }

export function sampleSnapshot(): Snapshot {
  const createdAt = Date.now() - 30 * 86_400_000;
  const deck = { id: "e2e-deck", name: "E2E vocabulary", emoji: "📗", createdAt };
  const pairs = [["cat", "แมว"], ["dog", "สุนัข"], ["sun", "ดวงอาทิตย์"], ["moon", "ดวงจันทร์"]];
  return {
    version: 1,
    decks: [deck],
    cards: pairs.map(([front, back], index) => ({
      id: `e2e-${front}`, deckId: deck.id, front, back, createdAt,
      interval: 1, ease: 2.5, streak: index >= 2 ? 1 : 0,
      due: index === 0 || index === 3 ? Date.now() + 86_400_000 : createdAt,
      level: "B1", source: "manual",
    })),
  };
}

// Context storage is installed once, not on every navigation or reload.
export const test = base.extend<{ snapshot: Snapshot | null }>({
  snapshot: [sampleSnapshot(), { option: true }],
  storageState: async ({ baseURL, snapshot }, provide) => {
    await provide({ cookies: [], origins: snapshot ? [{
      origin: baseURL!, localStorage: [{ name: "fc_storage", value: JSON.stringify(snapshot) }],
    }] : [] });
  },
  page: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(`${page.url()}: ${error.stack ?? error.message}`));
    await page.route("**/api/translate**", route => route.fulfill({
      status: 503, contentType: "application/json",
      body: JSON.stringify({ error: "Translation unavailable in offline E2E tests" }),
    }));
    await provide(page);
    expect(errors, "Uncaught browser errors").toEqual([]);
  },
});

export { expect };

export async function savedSnapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("fc_storage")!));
}
