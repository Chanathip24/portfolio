import { expect, test } from "../support/fixtures";

// The structure a screen reader (and a search engine) gets from the public pages: landmarks, headings, names, links. This is the same
// text on every machine, so unlike a screenshot it needs no baseline images, and a failure says which part of the page changed.
// Each template is a subset of what the page exposes: it must appear in this order, and anything extra is allowed. Content that
// changes (view counts, dates, local times, the sample posts' titles) is left out or matched by a pattern.
test.describe("what the public pages expose", () => {
  test("the main menu and the footer", async ({ visitor: page }) => {
    await page.goto("/about");
    await expect(page.getByRole("navigation", { name: "Main" })).toMatchAriaSnapshot(`
      - navigation "Main":
        - link /, home/:
          - /url: /
        - link "Work"
        - link "About":
          - /url: /about
        - link "Blog":
          - /url: /blog
        - link "Small talk"
        - button /Switch to (dark|light) mode/
    `);
    await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot(`
      - contentinfo:
        - list:
          - listitem:
            - link "GitHub"
        - navigation "Footer":
          - list:
            - listitem:
              - link "Work"
            - listitem:
              - link "About":
                - /url: /about
            - listitem:
              - link "Blog":
                - /url: /blog
        - list "Local times"
        - paragraph:
          - link "Privacy":
            - /url: /privacy
    `);
  });

  test("the privacy notice a new visitor sees", async ({ visitor: page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("region", { name: "Privacy notice" })).toMatchAriaSnapshot(`
      - region "Privacy notice":
        - paragraph:
          - link "Details":
            - /url: /privacy
        - button "Opt out"
        - button "OK"
    `);
  });

  test("the home page", async ({ visitor: page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading [level=1]
        - region "Selected projects":
          - tablist "Filter projects by tag":
            - tab /All \\d+/ [selected]
          - link:
            - heading [level=3]
          - heading /More projects/ [level=3]
    `);
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: smallTalkHeading })).toBeVisible();
  });

  test("the blog list", async ({ visitor: page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading "Blog" [level=1]
        - tablist "Filter by category":
          - tab /All \\d+/ [selected]
        - button "Latest"
        - searchbox "Search posts"
        - paragraph: /Showing 1–\\d+ of \\d+ posts/
        - list:
          - listitem:
            - link:
              - heading [level=2]
        - navigation "pagination":
          - list:
            - listitem:
              - link "Go to next page":
                - /url: /blog?page=2
    `);
  });

  test("a post: breadcrumb, one h1, the facts, Share, and the contents list that links to its headings", async ({ visitor: page }) => {
    await page.goto("/blog/money-is-an-integer");
    await expect(page.getByRole("article")).toMatchAriaSnapshot(`
      - article:
        - navigation "breadcrumb":
          - list:
            - listitem:
              - link "Home"
            - listitem:
              - link "Blog":
                - /url: /blog
        - heading "Money is an integer" [level=1]
        - list "Post category":
          - listitem: Data
        - term: Published
        - term: Reading time
        - button "Share"
        - img "Money is an integer cover"
        - complementary:
          - navigation "On this page":
            - list:
              - listitem:
                - link "Where it started":
                  - /url: "#where-it-started"
              - listitem:
                - link "What I tried":
                  - /url: "#what-i-tried"
    `);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("the page for a missing address", async ({ visitor: page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading "Page not found" [level=1]
        - paragraph:
          - link "Home":
            - /url: /
          - link "Blog":
            - /url: /blog
          - link "About":
            - /url: /about
    `);
  });
});

const smallTalkHeading = "Small talk";
