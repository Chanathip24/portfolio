import { expect, test } from "@playwright/test";

// The globe on the home page is fetched only when its scene is about to be reached, not with the first screen.
test("the globe is not loaded with the first screen, and appears once the page is scrolled towards it", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", (r) => { if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) scripts.push(r.url()); });
  await page.goto("/", { waitUntil: "networkidle" });
  const globe = page.getByRole("img", { name: /^Globe turning to/ });
  await expect(globe).toHaveCount(0);
  const first = scripts.length;

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.35));
  await expect(globe).toBeAttached();
  expect(scripts.length).toBeGreaterThan(first); // its code arrived on demand
});
