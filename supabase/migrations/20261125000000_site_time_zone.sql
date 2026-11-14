-- The admin's day charts count in the site's own time zone (owner.timeZone in src/content/site.ts), not UTC: a visit at 01:00 in
-- Bangkok belongs to that day's bar. Each summary gets a time-zone argument that defaults to UTC, so older callers behave as before.

drop function public.analytics_summary(integer);
CREATE OR REPLACE FUNCTION public.analytics_summary(days integer DEFAULT 30, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with v as (
    select * from public.page_views where created_at >= now() - make_interval(days => least(greatest(days, 1), 365))
  )
  select jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by d.day)
      from generate_series((now() at time zone p_tz)::date - (least(greatest(days, 1), 365) - 1), (now() at time zone p_tz)::date, '1 day') as d(day)
      left join (select (created_at at time zone p_tz)::date as day, count(*) as views, count(distinct visitor) as visitors from v group by 1) c on c.day = d.day::date
    ), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v group by path order by views desc limit 10) t), '[]'::jsonb),
    'top_referrers', coalesce((select jsonb_agg(t) from (select referrer, count(*) as views from v where referrer is not null and referrer <> '' group by referrer order by views desc limit 8) t), '[]'::jsonb)
  );
$function$;

drop function public.section_analytics(text, text, integer);
CREATE OR REPLACE FUNCTION public.section_analytics(p_prefix text, p_path text DEFAULT NULL::text, days integer DEFAULT 30, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
      from generate_series((now() at time zone p_tz)::date - (least(greatest(days, 1), 365) - 1), (now() at time zone p_tz)::date, '1 day') as d(day)
      left join (select (created_at at time zone p_tz)::date as day, count(*) as views, count(distinct visitor) as visitors from v group by 1) c on c.day = d.day::date
    ), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v group by path order by views desc limit 8) t), '[]'::jsonb),
    'referrers', coalesce((select jsonb_agg(t) from (select referrer, count(*) as views from v where referrer is not null and referrer <> '' group by referrer order by views desc limit 8) t), '[]'::jsonb)
  );
$function$;

drop function public.performance_summary(integer);
CREATE OR REPLACE FUNCTION public.performance_summary(days integer DEFAULT 30, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with v as (select * from public.web_vitals where created_at >= now() - make_interval(days => least(greatest(days, 1), 365)))
  select jsonb_build_object(
    'samples', (select count(*) from v),
    'metrics', coalesce((select jsonb_agg(m) from (
      select metric, count(*) as n, percentile_cont(0.75) within group (order by value) as p75,
        count(*) filter (where rating = 'good') as good, count(*) filter (where rating = 'needs-improvement') as mid, count(*) filter (where rating = 'poor') as poor
      from v group by metric) m), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(d order by d.day) from (
      select (created_at at time zone p_tz)::date as day, metric, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from v group by 1, 2) d), '[]'::jsonb),
    'slow_pages', coalesce((select jsonb_agg(s) from (
      select path, percentile_cont(0.75) within group (order by value) as p75, count(*) as n from v where metric = 'LCP' group by path order by p75 desc limit 8) s), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (select device, count(*) as n from v group by device) x), '[]'::jsonb)
  );
$function$;

drop function public.error_summary(integer);
CREATE OR REPLACE FUNCTION public.error_summary(days integer DEFAULT 7, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
    'daily', coalesce((select jsonb_agg(d) from (select (created_at at time zone p_tz)::date as day, source, count(*) as n from e group by 1, 2) d), '[]'::jsonb),
    'paths', coalesce((select jsonb_agg(p) from (select path as name, count(*) as value from e group by path order by value desc limit 8) p), '[]'::jsonb)
  );
$function$;

drop function public.audit_stats(text, text, text, text, timestamp with time zone, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.audit_stats(p_q text DEFAULT NULL::text, p_action text DEFAULT NULL::text, p_entity text DEFAULT NULL::text, p_actor text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with f as (
    select at, actor_email, action, entity from public.audit_log
    where (p_action is null or action = p_action)
      and (p_entity is null or entity = p_entity)
      and (p_actor is null or (p_actor = 'system' and actor_email is null) or actor_email = p_actor)
      and (p_q is null or summary ilike '%' || p_q || '%' or actor_email ilike '%' || p_q || '%')
      and (p_from is null or at >= p_from)
      and (p_to is null or at < p_to)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'by_action', coalesce((select jsonb_agg(jsonb_build_object('name', action, 'value', n)) from (select action, count(*) n from f group by 1) t), '[]'::jsonb),
    'by_entity', coalesce((select jsonb_agg(jsonb_build_object('name', entity, 'value', n) order by n desc) from (select entity, count(*) n from f group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'by_actor', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(actor_email, 'System'), 'value', n) order by n desc) from (select actor_email, count(*) n from f group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'action', action, 'n', n)) from (select (at at time zone p_tz)::date as day, action, count(*) n from f group by 1, 2) t), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(entity order by entity) from (select distinct entity from public.audit_log) t), '[]'::jsonb),
    'actors', coalesce((select jsonb_agg(actor_email order by actor_email) from (select distinct actor_email from public.audit_log where actor_email is not null) t), '[]'::jsonb)
  );
$function$;
