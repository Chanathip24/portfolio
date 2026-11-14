-- Activity page counts in the database (instead of downloading thousands of rows), plus indexes for its filters.
create index audit_log_actor_at_idx on audit_log (actor_email, at desc);
create index audit_log_entity_at_idx on audit_log (entity, at desc);

create function audit_stats(
  p_q text default null, p_action text default null, p_entity text default null, p_actor text default null,
  p_from timestamptz default null, p_to timestamptz default null
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
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
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'action', action, 'n', n)) from (select (at at time zone 'UTC')::date as day, action, count(*) n from f group by 1, 2) t), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(entity order by entity) from (select distinct entity from public.audit_log) t), '[]'::jsonb),
    'actors', coalesce((select jsonb_agg(actor_email order by actor_email) from (select distinct actor_email from public.audit_log where actor_email is not null) t), '[]'::jsonb)
  );
$$;
