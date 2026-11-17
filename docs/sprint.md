# Sprint board

Owner: team-manager. Ticket format: `- [ID] Title (owner) - notes`

## Process
Teams
- Product: product-manager finds what to improve (UX/UI, new features) -> ui-ux-designer designs -> feature team builds.
- Feature team: software-engineer builds features.
- Platform team: performance-a11y-engineer works on accessibility and performance.
- Review: staff-engineer approves every plan and every diff before testing. The manager does not review code; it plans, assigns, tracks and reports.
- QA/infra: tester, security-auditor, devops (devops also does commits and pushes).

Flow per ticket
1. Engineer writes a short plan -> staff-engineer approves (S-size tickets: plan + diff reviewed together after implementation).
2. Implement -> staff-engineer reviews the diff -> tester (+ security-auditor if auth/API/input/headers/secrets).
3. Green -> devops commits to the feature branch and pushes. One branch per feature: `feat/<ticket>-<slug>`.
4. Merge to main (manager decides, devops executes; no need to wait for the user): .md-only changes merge directly; anything else merges only when the full test suite is green on that branch. Merge via GitHub PR (or, without gh, a temp worktree merge), never by switching branches in a tree another agent is using.

Token rules
- Models: staff-engineer + security-auditor on opus; everyone else on sonnet; trivial git chores on haiku.
- Reports: at most 250 words + one table; details go to files.
- During work run only the affected tests; run the full suite once per branch before push.
- Parallel work uses separate worktrees; only one agent at a time builds/serves from the main tree. Perf measurement runs alone.

## Current sprint
Goal: Public reads go through TanStack Query (server `prefetchQuery` + hydrated `useQuery`, browser cache persisted to localStorage), the public contact form uses `useMutation`, query/mutation endpoints write a structured server log, and `docs/performance/tanstack-query.md` compares before vs after. Mobile first.

### To do
- [TQ-11] Rebase TanStack Query work onto current main before TQ-10 (software-engineer) - main gained PRs #24-#28 (22 files: track/vitals "respond before writing", lazy-load globe, test fixtures/smoke tags/aria snapshots). Re-check TQ-9 README limits table vs new track/vitals code; tests must pass on new main.
- [TQ-10] Verify TQ-6/7/8 after TQ-3 (tester) - one build; add tests/feature/public-api.spec.ts (TQ-6), e2e restore check with planted public + admin keys at 390px + desktop (TQ-7), privacy-consent.spec.ts "public-query-cache" line (TQ-8); run persist-filter.spec.ts; full suite + lint green.
- [TQ-5] After measurement + comparison doc (tester) - same scripts as TQ-1; re-measure baseline 0a983dc and the new commit back to back on a quiet machine, --runs 9; write docs/performance/tanstack-query.md.

### In progress
- [PERF-1] Investigate slow blog detail page (/blog/[slug], seen 1403 ms in dev) (software-engineer) - root cause + fix PLAN only, isolated worktree, real UI clicks at 390px then desktop, prod build vs dev. Fix needs manager approval before implementation.
- [TQ-6] Fix TQ-4 findings on /api/public (software-engineer) - IMPLEMENTED (tsc clean, own files lint clean); waiting on tester build + public-api.spec.ts. Files: route.ts (withinLimit, no-store on errors, public s-maxage=60 swr=300 on 200), queries.ts (status on error, no retry on 4xx; public queries only). Tests: new tests/feature/public-api.spec.ts (headers per status, 429 at 121, other IP still 200 and no rate_limits row, retry predicate). Fix in test list: /posts returns {posts,categories}, not an array. Accepted trade-off: API may lag ~6 min after admin edit (see BL-9). M1: drop the DB-backed sharedLimit, use in-memory withinLimit + Cache-Control public s-maxage on 200 (absorbs BL-7). L1: no retry on 4xx in public queries. L3: no-store on 403/404/429. Tester reruns affected tests after.
- [TQ-7] Filter restored cache to "public" keys (was TQ-B0) (software-engineer) - IMPLEMENTED (tsc clean): publicOnly + isPublicKey in queries.ts, 3 lines in providers.tsx, tests/feature/persist-filter.spec.ts (forged blob + malformed blobs). Accepted deviation: publicOnly catches restore errors, removes the copy, returns undefined. Waiting on TQ-10 (run spec under Playwright + e2e seed check).
- [TQ-8] Privacy page mentions the public-query-cache in localStorage (was BL-5) (software-engineer) - IMPLEMENTED (tsc clean, page lint clean): bullet added, Last updated 17 November 2026. Waiting on TQ-10 spec line + phone check.
- [TQ-3] Tests for TQ-2 (tester) - hydration does no extra fetch on first load, cache restores from localStorage on reload, admin keys never persisted, contact mutation pending/success/error, phone + desktop. Required for TQ-2 to be Done. Done only when `npm run lint` is clean (open: tests/e2e/public-query.spec.ts:8 `any` -> `unknown`; tests/e2e/zz-probe.spec.ts has 5 `any` errors, a temporary probe that must be deleted or fixed).
- [TQ-2] (implemented; waiting on TQ-3 tests + TQ-4 audit) Integrate TanStack Query for public reads + contact mutation + server logs (software-engineer) - QueryClientProvider in providers.tsx, persisted cache (public keys only, never admin), prefetchQuery + HydrationBoundary on /blog, / (work), /about, GET route handlers reusing src/lib/api getters, `useMutation` in small-talk.tsx, one JSON log line per request (route, method, status, durationMs, no PII). Lint, tsc, build and existing tests green.

### Done
- [ORG-2] Merge chore/agent-team into main (devops) - merge commit a9774df pushed to main (e76d6ed..a9774df), md-only, no conflicts.
- [ORG-1] New team structure (devops) - commit c935372 on chore/agent-team, pushed. New agents: product-manager, staff-engineer, performance-a11y-engineer; models set. Active after session restart.
- [TQ-9] Document TRUSTED_PROXY_IP_HEADER (devops) - README section + limits table, .env.example line, DEPLOYMENT.md pointer + troubleshooting row. Corrected: track/vitals/errors drop silently (204) over limit, only public/contact return 429. Docs only, no test needed.
- [TQ-4] Security review of TQ-2 (security-auditor) - no high findings. M1 (limiter DB writes, many-IP abuse) + L1 (retry on 4xx, shared unknown bucket off Vercel) + L3 (cache headers) -> TQ-6. L2 -> TQ-B0. I1 (sameOrigin is no-op on GET) info only. npm audit --omit=dev: 0 vulns.
- [TQ-2a] Manager review of TQ-2 approach (team-manager) - approved. Accepted deviations: fetchQuery inside "use cache" snapshot instead of bare prefetchQuery (dehydrate reads Date.now, breaks prerender under cacheComponents); useSuspenseQuery (always hydrated, non-null types); manual persistQueryClient instead of PersistQueryClientProvider (broke 12-13 admin e2e). About Intro stays server-rendered (avoids shipping Tiptap). Cost: +11 KB gz JS on every page. Engineer test list = TQ-3 test plan.
- [TQ-1] Baseline performance measurement (tester) - done at 0a983dc. Raw: scratchpad perf-baseline.json, perf-baseline-run2.json, build-sizes-baseline.json; scripts measure-perf.mjs, build-sizes.mjs. Sizes/request counts are stable; cold LCP/load are noisy (local chunk-serving stalls).

## Backlog
- [TQ-B1] Move admin server actions (34 across src/app/admin/*-actions.ts) to useMutation / admin reads to useQuery - in-memory cache only, never persisted to browser storage.
- [BL-1] Duplicate RSC prefetches for /about and /blog after reload never complete (from TQ-1) - Next fires a second prefetch copy and the connection stays open; networkidle never fires. Investigate (Link prefetch / partialPrefetching).
- [BL-2] Local console 404s for /_vercel/insights and /_vercel/speed-insights scripts (from TQ-1) - load Analytics/SpeedInsights only on Vercel, or allow-list in the console-error test rule.
- [BL-3] LCP element is the privacy/consent notice paragraph, not page content (from TQ-1) - /about repeat LCP ~1.3 s on phone. Designer + engineer to review notice render timing.
- [BL-4] Local Supabase keeps leftover e2e edits (e.g. /about h1 "Edited by the e2e test.") (from TQ-1) - e2e tests should restore data they change.
- [BL-6] /blog ships a "Loading posts..." shell because BlogList uses useSearchParams (pre-existing) (from TQ-2) - read searchParams on the server or via nuqs so it can be fully static.
- [BL-7] (moved into TQ-6) /api/public rate limit DB cost.
- [BL-8] About Intro (profile/tools) not in the query cache (from TQ-2) - could join if bio HTML is pre-rendered server-side into the data.
- [BL-9] Admin edits revalidate server tags but not open browser caches or the CDN copy of /api/public (from TQ-2, TQ-6) - visitors see changes after up to ~5 min staleTime / ~6 min CDN; decide if acceptable.
- [BL-10] TanStack Query provider + persister load on admin pages too (+11 KB gz) (from TQ-2) - scope to the public layout if admin never uses it.
- [BL-12] About rows (career, skills, skill_groups, testimonials) are served as full `*` rows (from TQ-4) - pre-existing; select explicit columns so new DB columns don't go public automatically.
- [BL-13] Security review of areas outside TQ-4: admin auth/sessions, cron auth, Gmail OAuth callback, other API routes, git-history secrets, dev-dep audit (security-auditor).
- [BL-14] Off Vercel without TRUSTED_PROXY_IP_HEADER, admin sign-in skips the per-network limit (20) entirely (empty key always allowed) (from TQ-9; src/app/admin/auth-actions.ts:32-34, src/lib/admin/rate-limit.ts:10) - security-auditor to rate; consider failing closed or a shared bucket. Pre-existing.
- [BL-15] DEPLOYMENT.md last line says Inbox security notices record visitor IPs; stale, new notices omit addresses (from TQ-9) (devops).
- [ORG-3] GitHub CLI: installed 2.104.0 at C:\Program Files\GitHub CLI\gh.exe (devops). Remaining: user runs `gh auth login` in a new terminal.
