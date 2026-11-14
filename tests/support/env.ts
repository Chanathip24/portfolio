// Settings for the LOCAL Supabase stack (`supabase start`). These keys are the fixed demo keys every local stack uses; they only
// work against a stack on this machine. Point the tests at anything else only on purpose, via the environment variables.
export const PORT = process.env.TEST_PORT ?? "3100";
export const BASE = `http://localhost:${PORT}`;
export const SB_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
export const SB_SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(SB_URL) && !process.env.ALLOW_REMOTE_TESTS) {
  throw new Error(`Refusing to run the tests against ${SB_URL}: they create and delete users and content. Set ALLOW_REMOTE_TESTS=1 to override.`);
}
