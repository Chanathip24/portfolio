-- Revision history for everything an admin can change, image alt text for covers, sign-in attempt limits, and indexes.

-- ─── revisions: the row as it was before every real change or delete ──────────────────────────────
create table revisions (
  id bigint generated always as identity primary key,
  entity text not null,
  row_id text not null,
  action text not null check (action in ('updated', 'deleted')),
  label text not null default '',
  data jsonb not null,
  actor_id uuid,
  actor_email text,
  at timestamptz not null default now()
);
create index revisions_row_idx on revisions (entity, row_id, at desc);
create index revisions_at_idx on revisions (at desc);
alter table revisions enable row level security;
-- Admins read them. Nobody writes through the API: only the trigger below (security definer) adds rows, and the app restores by saving the old row back.
create policy "admin reads revisions" on revisions for select using ((select is_admin()));

create function keep_revision() returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) end;
  rid text := o ->> tg_argv[0];
begin
  -- Only real people's changes: seeds and the page-view counter have no signed-in user.
  if (select auth.uid()) is null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and (o - 'views' - 'updated_at') = (n - 'views' - 'updated_at') then return new; end if;
  insert into public.revisions (entity, row_id, action, label, data, actor_id, actor_email)
  values (tg_table_name, rid, case tg_op when 'UPDATE' then 'updated' else 'deleted' end,
    coalesce(o ->> 'title', o ->> 'name', o ->> 'label', o ->> 'role', o ->> 'author_name', o ->> 'display_name', o ->> 'slug', ''),
    o, (select auth.uid()), (select auth.jwt() ->> 'email'));
  -- Keep the newest 50 per item.
  delete from public.revisions where entity = tg_table_name and row_id = rid
    and id not in (select id from public.revisions where entity = tg_table_name and row_id = rid order by at desc, id desc limit 50);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts', 'projects', 'profile', 'socials', 'skills', 'tools', 'career', 'testimonials']
  loop
    execute format('create trigger %I after update or delete on %I for each row execute function keep_revision(''id'')', t || '_revision', t);
  end loop;
  foreach t in array array['post_categories', 'project_categories', 'skill_groups']
  loop
    execute format('create trigger %I after update or delete on %I for each row execute function keep_revision(''slug'')', t || '_revision', t);
  end loop;
end $$;

-- ─── alt text for cover images ────────────────────────────────────────────────────────────────────
alter table posts add column image_alt text not null default '' check (char_length(image_alt) <= 300);
alter table projects add column image_alt text not null default '' check (char_length(image_alt) <= 300);

-- ─── sign-in attempts, for rate limiting (server only: row level security on, no policies) ───────
create table auth_attempts (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) <= 20),
  key text not null check (char_length(key) <= 320),
  at timestamptz not null default now()
);
create index auth_attempts_lookup_idx on auth_attempts (kind, key, at desc);
alter table auth_attempts enable row level security;
revoke all on auth_attempts from anon, authenticated;

-- ─── indexes for the queries the admin runs on every page ────────────────────────────────────────
create index if not exists audit_log_entity_idx on audit_log (entity, action, entity_id);
create index if not exists audit_log_actor_idx on audit_log (actor_email);
create index if not exists messages_unread_idx on messages (received_at desc) where not is_read;
create index if not exists page_views_path_created_idx on page_views (path, created_at desc);
create index if not exists web_vitals_metric_idx on web_vitals (metric, created_at desc);
