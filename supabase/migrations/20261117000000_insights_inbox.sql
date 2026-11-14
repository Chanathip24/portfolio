-- Section analytics (blog or work), the inbox, and real-user performance numbers.

-- ─── views of one section ("/blog/", "/work/") or of one page in it ───────────────────────────────
drop function if exists post_analytics(text, int);
create function section_analytics(p_prefix text, p_path text default null, days int default 30) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with v as (
    select * from public.page_views
    where created_at >= now() - make_interval(days => least(greatest(days, 1), 365))
      and ((p_path is null and path like p_prefix || '%') or (p_path is not null and path = p_path))
  )
  select jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by d.day)
      from generate_series(current_date - (least(greatest(days, 1), 365) - 1), current_date, '1 day') as d(day)
      left join (select created_at::date as day, count(*) as views, count(distinct visitor) as visitors from v group by 1) c on c.day = d.day::date
    ), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v group by path order by views desc limit 8) t), '[]'::jsonb),
    'referrers', coalesce((select jsonb_agg(t) from (select referrer, count(*) as views from v where referrer is not null and referrer <> '' group by referrer order by views desc limit 8) t), '[]'::jsonb)
  );
$$;

-- ─── the inbox: contact-form messages, mail fetched from Gmail, and security notices ──────────────
create table messages (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('contact', 'gmail', 'system')),
  kind text not null default 'message' check (kind in ('message', 'security')),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  from_name text not null default '' check (char_length(from_name) <= 120),
  from_email text not null default '' check (char_length(from_email) <= 254),
  subject text not null default '' check (char_length(subject) <= 300),
  body text not null default '' check (char_length(body) <= 20000),
  external_id text unique,
  received_at timestamptz not null default now(),
  is_read boolean not null default false,
  starred boolean not null default false
);
create index messages_received_idx on messages (received_at desc);
alter table messages enable row level security;
create policy "admin reads messages" on messages for select using ((select is_admin()));
create policy "admin updates messages" on messages for update using ((select is_admin())) with check ((select is_admin()));
create policy "admin deletes messages" on messages for delete using ((select is_admin()));
-- A visitor can only leave a plain contact message; they can never read, change or mark anything.
create policy "visitors send contact messages" on messages for insert to anon, authenticated
  with check (source = 'contact' and kind = 'message' and severity = 'info' and not is_read and not starred and external_id is null and char_length(body) >= 1 and char_length(from_email) >= 3);

-- ─── real-user performance (Core Web Vitals) ─────────────────────────────────────────────────────
create table web_vitals (
  id bigint generated always as identity primary key,
  metric text not null check (metric in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  value double precision not null check (value >= 0 and value < 600000),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  path text not null check (path like '/%' and char_length(path) <= 300),
  device text not null default 'desktop' check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index web_vitals_created_idx on web_vitals (created_at desc);
alter table web_vitals enable row level security;
create policy "visitors add vitals" on web_vitals for insert to anon, authenticated with check (true);
create policy "admin reads vitals" on web_vitals for select using ((select is_admin()));

create function performance_summary(days int default 30) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with v as (select * from public.web_vitals where created_at >= now() - make_interval(days => least(greatest(days, 1), 365)))
  select jsonb_build_object(
    'samples', (select count(*) from v),
    'metrics', coalesce((select jsonb_agg(m) from (
      select metric, count(*) as n, percentile_cont(0.75) within group (order by value) as p75,
        count(*) filter (where rating = 'good') as good, count(*) filter (where rating = 'needs-improvement') as mid, count(*) filter (where rating = 'poor') as poor
      from v group by metric) m), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(d order by d.day) from (
      select created_at::date as day, metric, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from v group by 1, 2) d), '[]'::jsonb),
    'slow_pages', coalesce((select jsonb_agg(s) from (
      select path, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from v where metric = 'LCP' group by path order by p75 desc limit 8) s), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (select device, count(*) as n from v group by device) x), '[]'::jsonb)
  );
$$;
