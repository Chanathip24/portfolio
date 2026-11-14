-- Error monitoring: errors from visitors' browsers and from the server, grouped for the admin dashboard.
create table error_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('client', 'server')),
  fingerprint text not null check (char_length(fingerprint) <= 64),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  path text not null default '/' check (path like '/%' and char_length(path) <= 300),
  digest text check (char_length(digest) <= 64)
);
create index error_events_created_idx on error_events (created_at desc);
create index error_events_fingerprint_idx on error_events (fingerprint, created_at desc);
alter table error_events enable row level security;
-- Rows are written by the app with the service key; only the admin can read or clear them.
create policy "admin reads errors" on error_events for select using ((select is_admin()));
create policy "admin clears errors" on error_events for delete using ((select is_admin()));

create function error_summary(days int default 7) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with e as (select * from public.error_events where created_at >= now() - make_interval(days => least(greatest(days, 1), 365)))
  select jsonb_build_object(
    'total', (select count(*) from e),
    'groups', coalesce((select jsonb_agg(g order by g.last_seen desc) from (
      select fingerprint, count(*) as n, min(created_at) as first_seen, max(created_at) as last_seen,
        (array_agg(source order by created_at desc))[1] as source,
        (array_agg(message order by created_at desc))[1] as message,
        (array_agg(path order by created_at desc))[1] as path,
        (array_agg(stack order by created_at desc) filter (where stack is not null))[1] as stack,
        count(distinct path) as pages
      from e group by fingerprint order by max(created_at) desc limit 50) g), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(d) from (select (created_at at time zone 'UTC')::date as day, source, count(*) as n from e group by 1, 2) d), '[]'::jsonb),
    'paths', coalesce((select jsonb_agg(p) from (select path as name, count(*) as value from e group by path order by value desc limit 8) p), '[]'::jsonb)
  );
$$;
