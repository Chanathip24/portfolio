// Removes a user's authenticator (MFA) factors so the next sign-in shows the QR setup again.
// Local use:  node scripts/reset-mfa.mjs you@example.com
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (for the local stack: `npx supabase status -o env`).
// Run it yourself, from your machine only: the service-role key bypasses every security rule and must never go in the app.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/reset-mfa.mjs <email>");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
const user = data.users.find((u) => u.email === email);
if (!user) { console.error(`No user with email ${email}`); process.exit(1); }
const { data: factors } = await sb.auth.admin.mfa.listFactors({ userId: user.id });
for (const f of factors?.factors ?? []) await sb.auth.admin.mfa.deleteFactor({ userId: user.id, id: f.id });
console.log(`Removed ${factors?.factors?.length ?? 0} factor(s) for ${email}. Sign in again to set up a new authenticator.`);
