# Portfolio

A personal site (home, work, blog, about) with a private admin to run it. Next.js 16 (App Router, pre-rendered public pages with cached data), TypeScript, Tailwind v4, shadcn/ui on Base UI, Supabase (Postgres, Auth, Storage).

Without Supabase settings the site runs on the sample data in `src/mock/api` and `/admin` is off.

## Run it

You need Node 22, Docker (for the local Supabase stack) and Chrome (for the tests).

```bash
npm install
npm run db:start        # local Supabase in Docker (applies the migrations and sample content); prints the URL and keys
cp .env.example .env.local   # then fill in the values it printed
npm run dev
```

Open http://localhost:3000. The admin is at `/admin`.

### Environment

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase project. Safe to expose: Row Level Security decides what they can do. |
| `NEXT_PUBLIC_SITE_URL` | The public address of the site, for share previews, the sitemap and the feed. Defaults to `http://localhost:3000`. |
| `ANALYTICS_SALT` | Any long random string. Makes the daily visitor hash unguessable. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Needed for Users, the Inbox, rate limiting and security notices. Bypasses every security rule: never expose it. |

Gmail needs no Google-specific environment variables: connect it from **Settings, Gmail** (see below).

Public contact submissions and telemetry require `SUPABASE_SERVICE_ROLE_KEY`; without it contact returns 503 and telemetry is ignored.
Apply all migrations before deploying the matching app version (`npx supabase migration up --local` locally; your normal migration deployment for production).

### Request and session security

Public pages are pre-rendered and their data is cached (Next.js Cache Components: `use cache` with tags, 60-second and one-hour revalidation; the admin's saves clear the matching tags). Admin pages render on request and every admin response is `private, no-store` (`src/proxy.ts`).
The Content Security Policy is one fixed policy, built in `src/lib/csp.ts` and set in `next.config.ts`: scripts only from this site (inline scripts are allowed because Next and the theme script are inline, and a per-request nonce would stop pages being pre-rendered), no plugins, and `base-uri`, `form-action`, `connect-src` and `img-src` limited. Public framing is same-origin only; admin framing is denied.

Off Vercel, forwarded IP headers are ignored unless `TRUSTED_PROXY_IP_HEADER` names a header overwritten by your ingress.
Only set it when direct access to Next is blocked. Unknown networks share a conservative contact quota; sign-in uses a browser-scoped
counter instead of locking an email globally. Supabase's own Auth limits remain important when the ingress is unknown.
New security notices omit network addresses, and rate-limit identifiers are keyed hashes. Historical notices are retained as-is;
review their retention and any privacy notice for previously stored addresses.

User administration, password/authenticator changes, and Gmail setup require MFA within the previous 15 minutes.
An older session is sent to the authenticator page; after verifying, repeat the intended action. Refreshing a session token does not reset this age.

### Service-key rotation

Keep the service key in the deployment's server secret store. To rotate: pause contact/telemetry and admin mutations, rotate in Supabase,
update every server instance, redeploy, verify the ingestion endpoints and user-management authorization, then reconnect Gmail.
Gmail ciphertext is derived from this key, so old OAuth secrets/tokens cannot be decrypted after rotation: re-enter the Google client secret
and reconnect. Cached public reads use the publishable key and do not need service privileges. Never put a service key in browser configuration.

## The admin

First sign-in: create a user in Supabase Auth and add them to the `admins` table (the SQL is in `supabase/README.md`), then sign in and set up an authenticator app. Every admin needs the second factor. A lost one is reset from Users, or from your machine with `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/reset-mfa.mjs <email>`.

What it does: posts, projects, profile and About content (with a rich editor, image descriptions and captions, scheduled publishing), categories, users, an Inbox (contact form, Gmail, security notices), analytics for the site, posts and projects, real-user performance (Core Web Vitals), error monitoring, an activity log with charts, filters and several views, and a History page that restores any earlier version or deleted item with one click.

### Connect Gmail

1. In Google Cloud, turn on the Gmail API and create an OAuth client ID of type *Web application*. Add yourself as a test user.
2. In **Settings, Gmail**, copy the redirect address into the client, paste the client ID and secret, save, then press **Connect Gmail**.

The site only reads mail. While the Google app is in Testing mode, Google ends the connection after about a week; the Inbox then shows **Reconnect Gmail**. The client secret and token are stored encrypted, with a key derived from the service key.

## Privacy and measurement

The site measures visits, load times and errors without cookies: page views store the path, the outside referrer's host and a daily hash of IP + browser + date + `ANALYTICS_SALT`. Measurement is on by default, a banner says so once and offers **Opt out**, and Do Not Track counts as opting out. The choice lives in the browser's local storage (`src/lib/consent.ts`). Opting out also stops the Vercel Analytics and Speed Insights scripts. The `/privacy` page describes all of it; replace the placeholder name and email in `src/content/site.ts` before launch, and review the wording for your region. Anything that sets cookies later would need a real opt-in.

## Error monitoring

Errors from visitors' browsers (`src/components/error-reporter.tsx`, the error pages) go to `/api/errors`, and server errors are caught by `src/instrumentation.ts`. Both are stored in `error_events`, grouped by a fingerprint, and shown in **Admin, Errors** with counts, charts and stack traces. Nothing identifying is stored, and browser reports respect the opt-out above.

## Database

Migrations are in `supabase/migrations`, applied in order by `npm run db:reset` (wipes and rebuilds) or `npx supabase migration up` (adds new ones). `npm run db:seed-sql` regenerates `supabase/seed.sql` from the sample data in `src/mock/api`. Security lives in the database: Row Level Security with an `is_admin()` rule that needs both the admins list and a verified second factor (`aal2`). See `supabase/README.md`.

## Tests

The tests use the local Supabase stack and a production build.

```bash
npm run build
npm test                # component, feature and end-to-end
npm run test:ct         # components (Playwright CT)
npm run test:feature    # database rules, HTTP guards, tracking, SEO files
npm run test:e2e        # the admin in a real browser, desktop and phone
```

The Gmail tests talk to a fake Google (`tests/support/mock-google.mjs`), started automatically. See `tests/README.md`.

### Continuous integration

`.github/workflows/ci.yml` is the entry point and calls one file per stage:

| File | What it does |
|---|---|
| `checks.yml` | Type check (after `next typegen`), lint, a production build on the sample data, `npm audit` for shipped packages |
| `component.yml` | The component tests, with no database |
| `e2e.yml` | The feature and end-to-end tests in three parallel shards; each shard starts its own local Supabase (CLI pinned to 2.121.0) and builds the site |
| `report.yml` | Merges the shards into one Playwright HTML report, keeps it as the `playwright-report` artifact, and publishes it |
| `cleanup.yml` | Removes a closed or merged pull request's report page |

The report page is on the `gh-pages` branch: `main` publishes to the site root and each pull request to `pr-preview/pr-<number>/` (its own comment links to it). Set it up once: push so `gh-pages` exists, then **Settings, Pages, Source: Deploy from a branch, `gh-pages` / root**. Pull requests from forks only get the downloadable artifact. Runs that only change `*.md`, `LICENSE` or `dependabot.yml` are skipped.

Vercel also builds every branch, including `gh-pages`. In the Vercel project add an **Ignored Build Step** (`if [ "$VERCEL_GIT_COMMIT_REF" = "gh-pages" ]; then exit 0; else exit 1; fi`), and give **Preview** deployments their own Supabase project (separate URL and keys, and a different `ANALYTICS_SALT`) so previews never touch production data. Details are in [DEPLOYMENT.md](DEPLOYMENT.md).

### Dependency security

Run `npm audit` after dependency changes. The `minimatch` override for
`@typescript-eslint/typescript-estree` requires the patched 11.x release until
the upstream dependency range includes it. Node 22 is required as above.

The shadcn 4.23.0 stylesheet is vendored at `src/styles/shadcn.css` with its MIT
license alongside it. The CLI is not installed because its `deepmerge`
dependency has no patched release for GHSA-gcqx-w48m-w2h4. When adding components,
copy their source and review dependency changes before installing CLI tooling.

## Layout

| Path | What is there |
|---|---|
| `src/app` | Public pages, `/admin`, API routes (`/api/track`, `/api/vitals`, `/api/errors`, `/api/contact`, `/api/gmail/*`), `/privacy`, `sitemap`, `robots`, `feed.xml` |
| `src/components` | Public components, `ui/` (shadcn), `admin/` (admin screens and shared pieces) |
| `src/lib` | API access, admin data and actions, Supabase clients, analytics helpers |
| `src/instrumentation.ts` | Records server errors |
| `supabase` | Migrations, seed, config |
| `.github` | CI workflows and Dependabot |
| `tests` | `component`, `feature`, `e2e`, shared `support` |

## Deploying

The full walkthrough for Vercel and Supabase Cloud (database, admin account, Auth settings, environment variables, Gmail, checks and troubleshooting) is in [DEPLOYMENT.md](DEPLOYMENT.md). In short: push the migrations with `npx supabase db push`, create your admin, set the environment variables on Vercel before the first build, and deploy.
