import { defineConfig } from "@playwright/test";

const PORT = process.env.TEST_PORT ?? "3100";
const MOCK_PORT = process.env.MOCK_GOOGLE_PORT ?? "3199";

/** Feature and end-to-end tests. They need the local Supabase stack (`npm run db:start`) and a production build (`npm run build`);
 *  the app is started here on its own port so it never collides with `npm run dev`. Component tests: playwright-ct.config.ts. */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["feature/**/*.spec.ts", "e2e/**/*.spec.ts"],
  // One worker: the tests share one local database, and each file builds on rows it created itself.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./tests/support/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome", // the Chrome that is already installed; no browser download
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "feature", testMatch: /feature\/.*\.spec\.ts/ },
    { name: "e2e-desktop", testMatch: /e2e\/(?!phone).*\.spec\.ts/ },
    { name: "e2e-phone", testMatch: /e2e\/phone\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: [
    // A fake Google for the "Connect Gmail" tests (tests/support/mock-google.mjs).
    { command: "node tests/support/mock-google.mjs", url: `http://localhost:${MOCK_PORT}/__state`, reuseExistingServer: true, timeout: 30_000 },
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/admin/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { GOOGLE_MOCK_ORIGIN: `http://localhost:${MOCK_PORT}` },
    },
  ],
});
