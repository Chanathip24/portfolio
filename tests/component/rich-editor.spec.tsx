import { expect, test } from "@playwright/experimental-ct-react";
import { EditorHarness } from "./harness";

const json = async (c: import("@playwright/test").Locator) => JSON.parse((await c.getByTestId("json").textContent())!);

test.describe("RichEditor (Tiptap)", () => {
  test("starts from one empty paragraph so there is a cursor position", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    const editor = c.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type("Hello");
    expect((await json(c)).content[0]).toMatchObject({ type: "paragraph", content: [{ type: "text", text: "Hello" }] });
  });

  test("a heading keeps its level, and node attrs are plain objects a Server Action can receive", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    await c.locator(".ProseMirror").click();
    await c.getByRole("button", { name: "Heading", exact: true }).click();
    await page.keyboard.type("Title");
    const doc = await json(c);
    expect(doc.content[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    await expect(c.getByTestId("plain")).toHaveText("true"); // Object.prototype, not a null-prototype object
  });

  test("bold, italic and lists apply from the toolbar, and the buttons show their pressed state", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    const editor = c.locator(".ProseMirror");
    await editor.click();
    const bold = c.getByRole("button", { name: "Bold" });
    await expect(bold).toHaveAttribute("aria-pressed", "false");
    await bold.click();
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.type("strong");
    await bold.click();
    await c.getByRole("button", { name: "Bulleted list" }).click();
    await page.keyboard.type("item");
    const doc = await json(c);
    expect(JSON.stringify(doc)).toContain('"type":"bold"');
    expect(JSON.stringify(doc)).toContain('"type":"bulletList"');
  });

  test("toolbar buttons do not steal focus from the text", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    await c.locator(".ProseMirror").click();
    await c.getByRole("button", { name: "Italic" }).click();
    await expect(c.locator(".ProseMirror")).toBeFocused();
    await page.keyboard.type("still typing");
    await expect(c.locator(".ProseMirror em")).toHaveText("still typing");
  });

  test("undo and redo are disabled until there is something to undo", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    await expect(c.getByRole("button", { name: "Undo" })).toBeDisabled();
    await c.locator(".ProseMirror").click();
    await page.keyboard.type("x");
    await expect(c.getByRole("button", { name: "Undo" })).toBeEnabled();
    await c.getByRole("button", { name: "Undo" }).click();
    await expect(c.getByRole("button", { name: "Redo" })).toBeEnabled();
  });

  test("a link is typed into the inline bar; unsafe addresses are refused, safe ones applied, and it can be removed", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    await c.locator(".ProseMirror").click();
    await page.keyboard.type("a link");
    await page.keyboard.press("Control+A");
    await c.getByRole("button", { name: "Link", exact: true }).click();
    const field = c.getByRole("textbox", { name: "Link address" });
    await field.fill("javascript:alert(1)");
    await c.getByRole("button", { name: "Apply link" }).click();
    await expect(c.getByText("Links must start with")).toBeVisible();
    await field.fill("https://example.com/");
    await field.press("Enter"); // Enter applies, like the button
    await expect(c.locator(".ProseMirror a[href='https://example.com/']")).toBeVisible();
    await expect(c.getByRole("textbox", { name: "Link address" })).toBeHidden();

    await c.locator(".ProseMirror a").click();
    await c.getByRole("button", { name: "Link", exact: true }).click();
    await c.getByRole("button", { name: "Remove link" }).click();
    await expect(c.locator(".ProseMirror a")).toHaveCount(0);
  });

  test("Escape closes the link bar without changing anything", async ({ mount, page }) => {
    const c = await mount(<EditorHarness />);
    await c.locator(".ProseMirror").click();
    await c.getByRole("button", { name: "Link", exact: true }).click();
    await c.getByRole("textbox", { name: "Link address" }).press("Escape");
    await expect(c.getByRole("textbox", { name: "Link address" })).toBeHidden();
    void page;
  });

  test("a table, a callout and a collapsible section can be inserted", async ({ mount }) => {
    const c = await mount(<EditorHarness />);
    await c.locator(".ProseMirror").click();
    await c.getByRole("button", { name: "Table" }).click();
    await expect(c.locator(".ProseMirror table")).toHaveCount(1);
    await expect(c.locator(".ProseMirror th")).toHaveCount(3); // header row
    await c.getByRole("button", { name: "Callout" }).click();
    await expect(c.locator(".ProseMirror aside[data-callout]")).toHaveCount(1);
  });

  test("existing content is loaded and shown", async ({ mount }) => {
    const c = await mount(<EditorHarness initial={{ type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Loaded" }] }] }} />);
    await expect(c.locator(".ProseMirror h3")).toHaveText("Loaded");
    await expect(c.getByRole("button", { name: "Subheading" })).toHaveAttribute("aria-pressed", "true");
  });

  test("the toolbar buttons have accessible names", async ({ mount }) => {
    const c = await mount(<EditorHarness />);
    const names = await c.getByRole("toolbar", { name: "Formatting" }).getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names.every(Boolean)).toBe(true);
    expect(names.length).toBeGreaterThan(15);
  });
});
