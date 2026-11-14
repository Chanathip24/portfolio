# Tests

Everything uses Playwright, in three layers:

| Layer | Folder | What it checks | Needs |
| --- | --- | --- | --- |
| Component | `tests/component` | One component at a time in a real browser, with the app's own CSS: the Select, the date picker, the rich-text editor, Input/Textarea/Tooltip. | nothing running |
| Feature | `tests/feature` | Rules that hold without a browser: the database's security (who can read and write what), the page-view endpoint, plain-HTTP guards on `/admin`. | local Supabase |
| End to end | `tests/e2e` | Whole flows in Chrome: sign-in with MFA, posts, projects, profile and About lists, analytics, form controls, and a phone-sized screen. | local Supabase + a build |

## Running

```bash
npm run db:start      # local Supabase in Docker (first time downloads images). Docker must be running.
npm run build         # the e2e and feature tests run against the production build
npm test              # component, then feature, then e2e
```

Or one layer: `npm run test:ct`, `npm run test:feature`, `npm run test:e2e`. After a failure, `npm run test:report` opens the HTML report
(screenshots and traces are kept for failed tests). The app is started on port 3100 by the test run (`TEST_PORT` to change it), so it
never clashes with `npm run dev`.

## What they touch

- They use the Chrome that is already installed (no browser download).
- Each run creates throwaway users named `e2e-…@test.local` and content slugged or named `e2e…`, and removes them afterwards
  (`tests/support/global-teardown.ts`). Your own accounts and content are not touched.
- The tests refuse to run against anything but a local Supabase unless you set `ALLOW_REMOTE_TESTS=1`. Don't, on a real project.
- The keys in `tests/support/env.ts` are the fixed demo keys of every local Supabase stack. They only work on your own machine.

## Writing more

- Tests that need to be signed in import `test` from `tests/support/fixtures.ts`: `page` starts as an admin (MFA done once per run).
  Tests of sign-in itself import `test` from `@playwright/test` and make their own user with `createUser()`.
- `browser.newContext()` inside a fixtures-based test inherits the admin session; pass `storageState: { cookies: [], origins: [] }` for a visitor.
- Component tests mount small stateful wrappers from `tests/component/harness.tsx`. Components that import `next/*` or Server Actions can't be
  mounted there; test them end to end.
