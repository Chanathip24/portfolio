-- Blog analytics for the admin: all posts together (p_path null) or one post (its /blog/<slug> path).
-- security invoker, so the page_views policy applies and only an admin gets numbers.
create function post_analytics(p_path text default null, days int default 30) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with v as (
    select * from public.page_views
    where created_at >= now() - make_interval(days => least(greatest(days, 1), 365))
      and ((p_path is null and path like '/blog/%') or (p_path is not null and path = p_path))
  )
  select jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by d.day)
      from generate_series(current_date - (least(greatest(days, 1), 365) - 1), current_date, '1 day') as d(day)
      left join (select created_at::date as day, count(*) as views, count(distinct visitor) as visitors from v group by 1) c on c.day = d.day::date
    ), '[]'::jsonb),
    'top_posts', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v group by path order by views desc limit 8) t), '[]'::jsonb),
    'referrers', coalesce((select jsonb_agg(t) from (select referrer, count(*) as views from v where referrer is not null and referrer <> '' group by referrer order by views desc limit 8) t), '[]'::jsonb)
  );
$$;
