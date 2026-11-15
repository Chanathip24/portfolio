import type { Page } from "@playwright/test";

/** Waits until a page has finished loading and drawing, so a test never needs a fixed pause: the load event has fired, fonts are in,
 *  nothing is still mid-animation (looping animations are ignored, they never end), and two frames have been painted, which is
 *  after the page's scripts have run their first effects. Animations driven from JavaScript rather than the browser are not
 *  visible here; a test that depends on one should wait for something that shows it is done. */
export async function settled(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const running = () => document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity);
    for (let round = 0; round < 10 && running().length; round++) await Promise.all(running().map((a) => a.finished.catch(() => {}))); // one can start another
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
