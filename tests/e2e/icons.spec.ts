import { test, expect } from "./fixtures";

test("local icon font and decorative masks render without external requests", async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on("response", response => {
    if (/\/(fonts|icons)\//.test(response.url()) && !response.ok()) failures.push(response.url());
  });
  const external: string[] = [];
  page.on("request", request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Grid view", exact: true })).toBeVisible();
  const glyph = page.getByRole("button", { name: "Grid view", exact: true }).locator(".fc-icon");
  await expect(glyph).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(font => font.family.includes("uicons-regular-rounded") && font.status === "loaded");
  })).toBe(true);
  expect(await glyph.evaluate(element => getComputedStyle(element, "::before").content)).not.toBe("none");
  // The existing mobile layout deliberately hides the large mode illustrations.
  for (const art of await page.locator(".noun-art:visible").all()) {
    expect((await art.boundingBox())!.width).toBeGreaterThan(0);
    const mask = await art.evaluate(element => getComputedStyle(element).maskImage);
    expect(mask).toMatch(/\/icons\/noun\/.*\.png/);
    // Decode the actual fetched mask: a file existing on disk is not enough.
    const decoded = await art.evaluate(async element => {
      const url = getComputedStyle(element).maskImage.slice(5, -2);
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
      const context = canvas.getContext("2d")!; context.drawImage(img, 0, 0);
      const pixels = context.getImageData(0, 0, img.width, img.height).data;
      let transparent = false; let opaque = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] === 0) transparent = true;
        if (pixels[index] === 255) opaque = true;
      }
      return transparent && opaque;
    });
    expect(decoded, "Mask must contain artwork and transparent space").toBe(true);
  }
  expect(failures).toEqual([]);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach("library", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});
