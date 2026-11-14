# Deploying on Vercel with Supabase Cloud

This takes the site from your machine to a live address: the public site and `/admin` on Vercel, the database, sign-in and image storage on Supabase Cloud. Allow about 30 minutes the first time.

Do the steps in order. The most common mistake is deploying before the environment variables are set (see step 4).

## What you need

- A GitHub (or GitLab, Bitbucket) repository with this project pushed to it.
- A [Vercel](https://vercel.com) account and a [Supabase](https://supabase.com) account.
- Node 22 and Docker installed locally (only for running the Supabase command line; the cloud project needs neither).
- Optional: a domain name, and a Google Cloud project if you want Gmail in the Inbox.

## 1. Create the Supabase project

1. In Supabase, create a new project. Choose a region close to your visitors (and remember it for step 5).
2. Save the database password somewhere safe. You will not need it day to day.
3. From **Project settings, API**, copy three values for later:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **Publishable key** (safe to expose; Row Level Security limits what it can do)
   - **Service role key** (secret: it bypasses every security rule)
4. Note the **project reference** (the `<ref>` in the URL).

## 2. Create the database

From the repository, link the command line to the project and apply the migrations:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

`db push` runs every file in `supabase/migrations` in order. It creates the tables, the security rules (Row Level Security and the `is_admin()` check), the `media` image bucket, and the functions the admin uses.

When the project changes later and you add a migration, run `npx supabase db push` again **before** deploying the code that needs it.

### Sample content (optional)

The migrations create structure only. Sample content is in `supabase/seed.sql` (placeholder name, bio and posts). You can:

- load it once: `npx supabase db push --include-seed` (recent command-line versions; check with `npx supabase db push --help`), or paste `supabase/seed.sql` into the dashboard's **SQL Editor** and run it; or
- skip it and write your real content in the admin.

Run the seed once only. Its rows have fixed ids, so a second run fails with duplicate-key errors.

## 3. Create your admin

Neither migrations nor the seed create an admin account. You do it by hand:

1. In Supabase, **Authentication, Users, Add user**. Enter your email and a strong password, and tick **Auto Confirm User**.
2. In the **SQL Editor** run (with your email):

   ```sql
   insert into admins (user_id) select id from auth.users where email = 'you@example.com';
   ```

3. After the site is live (step 6), sign in at `/admin/login` and scan the QR code with an authenticator app. From then on every sign-in needs the 6-digit code.

## 4. Set up Supabase Authentication

In Supabase, **Authentication**:

| Setting | Value |
|---|---|
| Sign In / Providers, Email | **On** (sign-in stops working if you turn it off) |
| Allow new users to sign up | **Off** (nobody can register; you create people from the admin) |
| Multi-factor, TOTP | **Enabled** (enrol and verify) |
| URL Configuration, Site URL | Your public address, for example `https://yourname.com` |
| URL Configuration, Redirect URLs | Add your public address and, while testing, your Vercel preview address |

## 5. Deploy on Vercel

1. In Vercel, **Add New, Project**, and import the repository. Vercel detects Next.js; leave the build settings at their defaults (`npm run build`).
2. Under **Settings, Environment Variables**, add these **before the first build** and apply them to Production (and Preview, if you use previews):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | The project URL from step 1 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | The service role key. Never give it a `NEXT_PUBLIC_` name. |
   | `ANALYTICS_SALT` | A long random string (`openssl rand -hex 32`) |
   | `NEXT_PUBLIC_SITE_URL` | Your public address, no trailing slash |

   `NEXT_PUBLIC_` values are written into the page code at build time. If you add or change one, **redeploy** or the site keeps the old value (and, with no Supabase address at build time, runs on sample data with the admin switched off).
3. Under **Settings, Functions**, set the **Function Region** to the one nearest your Supabase region. Page and admin requests then reach the database over a short hop.
4. Under **Settings, General**, use Node.js 22.
5. Click **Deploy**.

### Your own domain

In Vercel, **Settings, Domains**, add your domain and follow the DNS instructions. Then check `NEXT_PUBLIC_SITE_URL`, the Supabase **Site URL** (step 4) and, if used, the Google redirect (below) all use that exact address.

## 6. Check it works

Open these on the live address:

| Address | You should see |
|---|---|
| `/` , `/blog`, `/about` | The site with your content |
| `/robots.txt` | `Disallow: /admin`, and a `Sitemap:` line with your address |
| `/sitemap.xml`, `/feed.xml` | Your published posts and projects |
| `/admin/login` | The sign-in page. Sign in, then the authenticator step. |
| `/admin/settings` | The Settings page |

Then, signed in:
- Create a post, publish it, and open it on the public site.
- Upload a cover image. It is stored in your project's `media` bucket and shown through the site's image settings, which already allow your project's address.
- Open **Inbox** and send a message from the contact box on the home page (in a private window): it should appear.

## 7. Connect Gmail (optional)

1. In Google Cloud, turn on the **Gmail API** and create an **OAuth client ID** of type **Web application**. Add yourself as a test user on the consent screen.
2. Add this authorised redirect address (use your real domain):

   ```
   https://yourname.com/api/gmail/callback
   ```
3. In the admin, **Settings, Gmail**: paste the client ID and secret, save, then press **Connect Gmail**.

The site only reads mail. While the Google app is in Testing mode, Google ends the connection after about a week and the Inbox shows **Reconnect Gmail**.

## 8. Day to day

- **Content** changes in the admin appear on the public site within a minute. Saving in the admin refreshes the cached pages straight away.
- **A new version of the code**: push to the connected branch. Vercel builds and deploys. If the change includes a migration in `supabase/migrations`, run `npx supabase db push` first.
- **Mistakes**: **History** in the admin restores any earlier version or deleted item with one click.
- **Preview deployments** share your Supabase project unless you give Preview its own variables. For anything risky, create a second Supabase project and point Preview at it.
- **Backups**: Supabase keeps daily backups on paid plans. On the free plan, export what matters (posts, projects, settings) now and then.

## Previews and staging

Vercel builds every pull request as a preview. Keep previews away from your real data:

1. Create a second Supabase project (staging), link it with `npx supabase link --project-ref <staging-ref>` and run `npx supabase db push`. Check which project you linked before pushing. Load `supabase/seed.sql` there if you want sample content; never on production.
2. Apply the Authentication settings from step 4 to it (sign-ups off, TOTP on, password rules) and create an admin there as in step 3.
3. In Vercel, **Settings, Environment Variables**: give the staging values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and a different `ANALYTICS_SALT` to **Preview** only, and keep the production values on **Production** only. A variable ticked for all environments would send previews to production. `NEXT_PUBLIC_*` values are fixed at build time, so redeploy after changing them.
4. Or leave the Supabase variables unset for Preview: previews then show the sample data and the admin is off.
5. CI publishes test reports to a `gh-pages` branch. In **Settings, Git, Ignored Build Step** use `if [ "$VERCEL_GIT_COMMIT_REF" = "gh-pages" ]; then exit 0; else exit 1; fi` so Vercel skips it (exit 0 skips, exit 1 builds).

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| The site shows sample content and `/admin` is 404 | The Supabase variables were missing at build time. Add them, then redeploy. |
| Sign-in does nothing, or "Wrong email or password" with the right password | The Email provider is off, or you never created the user (step 3). |
| Signed in, then sent back to the sign-in page | The email is not in the `admins` table (step 3.2), or MFA is not enabled in Supabase Auth. |
| "Too many attempts" | Five wrong passwords for one address in ten minutes. Wait ten minutes. |
| Users, Inbox, rate limiting or security notices do nothing | `SUPABASE_SERVICE_ROLE_KEY` is missing on Vercel. |
| Images from uploads do not show | The Supabase URL variable is missing or wrong, or the build used an old one. Fix it and redeploy. |
| Share links show the wrong address | `NEXT_PUBLIC_SITE_URL` is missing or has a trailing slash. |
| Gmail says `redirect_uri_mismatch` | The redirect address in Google Cloud does not match `https://<your domain>/api/gmail/callback` exactly. |
| Performance page is empty | Nobody has visited yet, or you only visited while signed in to the admin (your own visits are not counted). Visit in a private window, click around, then leave the page. |
| A migration fails on `db push` | Read the error; usually the project already has a table from a failed earlier try. Fix it in the SQL Editor, then push again. |
| Build fails | Open the build log in Vercel. Run `npm run build` locally with the same variables to reproduce it. |

## Security reminders

- Keep `SUPABASE_SERVICE_ROLE_KEY` out of the browser, chat, screenshots and the repository.
- Keep sign-ups off in Supabase Auth.
- Every admin should use an authenticator app. A lost one is reset from **Users**.
- The security notices in the Inbox record the visitor's IP address. Mention it in your privacy notice if you publish one.
