import path from "node:path";
import { defineConfig } from "@playwright/experimental-ct-react";
import tailwindcss from "@tailwindcss/vite";

/** Component tests: single components mounted in a real browser, styled with the app's own CSS. Components that import next/*
 *  or Server Actions (the forms, the lists) are covered by the end-to-end tests instead. Run: npm run test:ct */
export default defineConfig({
  testDir: "./tests/component",
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    channel: "chrome",
    viewport: { width: 900, height: 700 },
    ctPort: 3200,
    ctViteConfig: {
      plugins: [tailwindcss()],
      resolve: { alias: { "@": path.resolve(__dirname, "src") } },
      // Code that reads NEXT_PUBLIC_* at load time needs a value in the browser bundle.
      define: {
        "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify("http://127.0.0.1:54321"),
        "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("component-test-key"),
      },
    },
  },
  projects: [{ name: "component" }],
});
