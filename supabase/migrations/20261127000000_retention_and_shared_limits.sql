-- Two things the automatically collected data needs: a limit shared by every server instance, and a rule for how long it is kept.

-- ─── shared rate limits ──────────────────────────────────────────────────────────────────────────
-- The public beacons (page views, load times, errors) used to count calls in each server instance's own memory, so a flood spread over
-- several instances got through. This counts in the database instead: one row per key, in a fixed window. Keys are hashes or fixed
-- names, never raw addresses. Only the server (service key) can use it.
create table rate_limits (
  key text primary key check (char_length(key) <= 80),
  window_start timestamptz not null default now(),
  hits int not null default 0
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

-- True while `p_key` has made at most `p_max` calls in the current window; the first call after a window ends starts a new one.
create function take_rate_slot(p_key text, p_max int, p_window_seconds int default 60) returns boolean
language sql security invoker set search_path = ''
as $$
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
  returning hits <= p_max;
$$;
revoke all on function take_rate_slot(text, int, int) from public, anon, authenticated;
grant execute on function take_rate_slot(text, int, int) to service_role;

-- ─── retention ───────────────────────────────────────────────────────────────────────────────────
-- Page views and load times only matter for the charts, errors only until they are fixed, and sign-in attempts only inside their
-- rate-limit windows. Content, messages, the activity log and history are never touched. Run daily by /api/cron/cleanup.
create function cleanup_old_data(p_views_days int default 180, p_errors_days int default 90, p_attempts_days int default 7) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare v bigint; w bigint; e bigint; a bigint; r bigint;
begin
  delete from public.page_views where created_at < now() - make_interval(days => p_views_days);
  get diagnostics v = row_count;
  delete from public.web_vitals where created_at < now() - make_interval(days => p_views_days);
  get diagnostics w = row_count;
  delete from public.error_events where created_at < now() - make_interval(days => p_errors_days);
  get diagnostics e = row_count;
  delete from public.auth_attempts where at < now() - make_interval(days => p_attempts_days);
  get diagnostics a = row_count;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics r = row_count;
  return jsonb_build_object('page_views', v, 'web_vitals', w, 'error_events', e, 'auth_attempts', a, 'rate_limits', r);
end;
$$;
revoke all on function cleanup_old_data(int, int, int) from public, anon, authenticated;
grant execute on function cleanup_old_data(int, int, int) to service_role;
