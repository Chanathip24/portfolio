# Supabase setup

The site runs on sample data until you connect a Supabase project; the admin (`/admin`) needs one.

## 1. Create the project and the schema

1. Create a project at supabase.com.
2. Apply the schema: either paste `migrations/20261114000000_init.sql` into the SQL editor, or use the CLI
   (`npx supabase link --project-ref <ref>` then `npx supabase db push`).
3. Optional sample content: paste `seed.sql` into the SQL editor (regenerate it with `node scripts/seed-sql.mjs`).
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key
   (Project settings, API), plus a random `ANALYTICS_SALT`.

## 2. Lock sign-in down (do this before creating your user)

In the dashboard, Authentication:

- **Sign In / Providers, Email:** turn **off** "Allow new users to sign up". Nobody can register; you create the one admin user yourself.
- **Password strength:** minimum 12 characters, require lower, upper, digits and symbols. Turn on leaked-password protection (Pro plan).
- **Multi-factor:** make sure **TOTP** is enabled (enrol and verify).
- **Rate limits:** keep the defaults or lower them.

(`config.toml` here holds the same settings for the local stack.)

## 3. Create your admin

1. Authentication, Users, **Add user**: your email and a strong password (tick auto-confirm).
2. Allow-list that user in the SQL editor:

   ```sql
   insert into admins (user_id) select id from auth.users where email = 'you@example.com';
   ```

3. Open `/admin`, sign in, and scan the QR code with an authenticator app. From then on every sign-in needs the code.

## How the admin is protected

| Layer | What it does |
| --- | --- |
| Sign-up disabled | No one can create an account. |
| Password + TOTP | Sign-in is two steps; the session only counts as admin at `aal2` (after the code). |
| `admins` table | Even a signed-in, MFA-verified user must be on the list. |
| Row Level Security | The database itself refuses writes unless `is_admin()` is true. The content tables are only ever written as the signed-in admin, so this holds even if the app has a bug. The service-role key is optional and used on the server only, after `requireAdmin()`: for Users, the Inbox, security notices and rate limiting. |
| `src/proxy.ts` | First gate for `/admin/*`: verifies the signed token, sends everyone else to sign in. |
| `requireAdmin()` | Every admin page and every Server Action re-checks, then validates input with zod. |
| Headers | `/admin` is `no-store` and cannot be framed. |

## Analytics

Public pages send one beacon per page view to `/api/track`. It stores the path, the outside referrer's host and a visitor id that is a
hash of IP + browser + the date + `ANALYTICS_SALT`: no cookies, no IP, nothing that follows a person across days. Bots, Do Not Track
and the signed-in admin are skipped. The admin Overview reads it through the `analytics_summary` function.

## Second migration: categories, logos, audit log, scheduling, settings

`migrations/20261115000000_admin_expansion.sql` (apply it after the first, the same way) adds:

- **Managed lists**: blog categories, work categories and skill groups are tables the admin edits (Categories screen). One in use cannot be deleted.
- **Tool logos**: a tool can have an uploaded logo; without one it uses its built-in icon, then its initials.
- **Scheduled publishing**: posts and projects have a publish date and time. A published item is visible to visitors only from that moment.
- **Audit log**: the database records who created, changed or deleted content (`audit_log`, readable by admins only). User-management actions are added through `log_event()`.
- **Settings**: `app_settings` holds the switch for the Data and Media screens (off by default).
- **Admin helpers**: `admin_status()` (who is an admin and whether their two-step sign-in is on) and `set_admin_flag()` (promote or demote; never yourself, never past the last admin).

## Managing users from the admin

The Users screen can add people, make them admins, set passwords, reset a lost authenticator, block and delete. Supabase only allows that with
the project's `service_role` key, so set `SUPABASE_SERVICE_ROLE_KEY` in the **server** environment (never `NEXT_PUBLIC_`, never committed). It is
only read in `src/lib/admin/users.ts`, never reaches the browser, and every action re-checks that the caller is a signed-in, MFA-verified admin
first. Without the key the Users screen explains how to switch it on and the rest of the admin works as before.
