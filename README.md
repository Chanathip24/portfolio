# Portfolio

A personal site (home, work, blog, about) with a private admin to run it. Next.js 16 (App Router, `cacheComponents`), TypeScript, Tailwind v4, shadcn/ui on Base UI, Supabase (Postgres, Auth, Storage).

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

Gmail needs no environment variables: connect it from **Settings, Gmail** (see below).

## The admin

First sign-in: create a user in Supabase Auth and add them to the `admins` table (the SQL is in `supabase/README.md`), then sign in and set up an authenticator app. Every admin needs the second factor. A lost one is reset from Users, or from your machine with `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/reset-mfa.mjs <email>`.

What it does: posts, projects, profile and About content (with a rich editor, image descriptions and captions, scheduled publishing), categories, users, an Inbox (contact form, Gmail, security notices), analytics for the site, posts and projects, real-user performance (Core Web Vitals), an activity log, and a History page that restores any earlier version or deleted item with one click.

### Connect Gmail

1. In Google Cloud, turn on the Gmail API and create an OAuth client ID of type *Web application*. Add yourself as a test user.
2. In **Settings, Gmail**, copy the redirect address into the client, paste the client ID and secret, save, then press **Connect Gmail**.

The site only reads mail. While the Google app is in Testing mode, Google ends the connection after about a week; the Inbox then shows **Reconnect Gmail**. The client secret and token are stored encrypted, with a key derived from the service key.

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

## Layout

| Path | What is there |
|---|---|
| `src/app` | Public pages, `/admin`, API routes (`/api/track`, `/api/vitals`, `/api/contact`, `/api/gmail/*`), `sitemap`, `robots`, `feed.xml` |
| `src/components` | Public components, `ui/` (shadcn), `admin/` (admin screens and shared pieces) |
| `src/lib` | API access, admin data and actions, Supabase clients, analytics helpers |
| `supabase` | Migrations, seed, config |
| `tests` | `component`, `feature`, `e2e`, shared `support` |

## Deploying

The full walkthrough for Vercel and Supabase Cloud (database, admin account, Auth settings, environment variables, Gmail, checks and troubleshooting) is in [DEPLOYMENT.md](DEPLOYMENT.md). In short: push the migrations with `npx supabase db push`, create your admin, set the environment variables on Vercel before the first build, and deploy.
