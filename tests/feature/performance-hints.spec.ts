import { expect, test } from "@playwright/test";

// Hints in the page that let the browser start early on things it will need.
test("the pages open a connection to the font host early", async ({ request }) => {
  for (const path of ["/", "/blog", "/about"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toMatch(/<link rel="preconnect" href="https:\/\/db\.onlinewebfonts\.com" crossorigin="anonymous"/);
  }
});
