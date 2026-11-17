import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { expect, test } from "@playwright/test";

// Reads the production build (`npm run build`) and checks the JS that only a post page loads (beyond the shared and layout chunks).
// The share menu list and the contents sheet are loaded on demand (PERF-3); if they slip back into the page this number jumps.
// Measured after PERF-3: 70.9 KB gzipped (72,600 bytes). Budget: that plus 5%. Raise it on purpose, with a reason, when the page grows.
const BUDGET_BYTES = 76_300;

test("a post page's own JavaScript stays within budget", () => {
  const next = path.join(process.cwd(), ".next");
  const size = (f: string) => zlib.gzipSync(fs.readFileSync(path.join(next, f)), { level: 9 }).length;
  const root: string[] = JSON.parse(fs.readFileSync(path.join(next, "build-manifest.json"), "utf8")).rootMainFiles;

  const ctx: { self: Record<string, unknown>; globalThis?: unknown } = { self: {} };
  ctx.globalThis = ctx.self;
  vm.runInNewContext(fs.readFileSync(path.join(next, "server/app/blog/[slug]/page_client-reference-manifest.js"), "utf8"), ctx);
  const manifest = Object.values(ctx.self.__RSC_MANIFEST as Record<string, { entryJSFiles: Record<string, string[]> }>)[0];
  const entries = manifest.entryJSFiles;
  const pageFiles = entries["[project]/src/app/blog/[slug]/page"];
  expect(pageFiles, "the post page entry is in the build manifest").toBeTruthy();

  const shared = new Set([...root, ...(entries["[project]/src/app/layout"] ?? [])]);
  const pageOnly = pageFiles.filter((f) => !shared.has(f));
  const bytes = pageOnly.reduce((sum, f) => sum + size(f), 0);
  expect(bytes).toBeGreaterThan(0);
  expect(bytes, `post page-only JS is ${(bytes / 1024).toFixed(1)} KB gzipped`).toBeLessThanOrEqual(BUDGET_BYTES);
});
