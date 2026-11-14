-- Second step: categories and skill groups the admin can manage, tool logos, scheduled publishing, an audit log,
-- app settings, and the helpers the admin screens need. Everything keeps the same rule: public read of published
-- content, writes only for an MFA-verified admin (is_admin()).

-- ─── categories and groups become data, not enums ─────────────────────────────────────────────────
create table post_categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48),
  name text not null check (char_length(name) between 1 and 48),
  sort_order int not null default 0
);
create table project_categories (like post_categories including all);
create table skill_groups (like post_categories including all);

insert into post_categories (slug, name, sort_order) values ('engineering', 'Engineering', 1), ('design', 'Design', 2), ('data', 'Data', 3), ('process', 'Process', 4);
insert into project_categories (slug, name, sort_order) values ('product', 'Product', 1), ('sync', 'Sync', 2), ('postgres', 'Postgres', 3), ('api', 'API', 4), ('payments', 'Payments', 5);
insert into skill_groups (slug, name, sort_order) values ('frontend', 'Frontend', 1), ('backend', 'Backend', 2), ('data', 'Data', 3), ('tooling', 'Tooling', 4);

-- posts.category -> text that must name a post category (restrict: a category in use cannot be deleted or renamed)
alter table posts alter column category drop default;
alter table posts alter column category type text using category::text;
alter table posts add constraint posts_category_fkey foreign key (category) references post_categories (slug) on update restrict on delete restrict;
drop type post_category;

-- skills.group -> the same idea
alter table skills alter column "group" type text using "group"::text;
alter table skills add constraint skills_group_fkey foreign key ("group") references skill_groups (slug) on update restrict on delete restrict;
drop type skill_group;

-- projects.tags is an array, which a foreign key cannot check, so a trigger does it
alter table projects alter column tags drop default;
alter table projects alter column tags type text[] using tags::text[];
update projects set tags = (select coalesce(array_agg(lower(t)), '{}') from unnest(tags) as t);
alter table projects alter column tags set default '{}';
drop type project_tag;

create function check_project_tags() returns trigger language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.tags) as t where t not in (select slug from public.project_categories)) then
    raise exception 'Unknown project category' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger projects_check_tags before insert or update of tags on projects for each row execute function check_project_tags();

create function guard_project_category() returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and exists (select 1 from public.projects where old.slug = any (tags)) then
    raise exception 'This category is used by projects' using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' and new.slug <> old.slug then
    raise exception 'A category slug cannot change' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;
create trigger project_categories_guard before update of slug or delete on project_categories for each row execute function guard_project_category();

-- ─── tools: an uploaded logo, and the built-in icon becomes optional ──────────────────────────────
alter table tools add column logo_url text check (logo_url is null or logo_url ~ '^(https?://|/)');
alter table tools alter column tool_key drop not null;

-- ─── scheduled publishing: a published item shows from its own date on ────────────────────────────
alter table projects add column published_at timestamptz not null default now();
update projects set published_at = created_at;

drop policy "read published posts" on posts;
create policy "read published posts" on posts for select using ((status = 'published' and published_at <= now()) or (select is_admin()));
drop policy "read published projects" on projects;
create policy "read published projects" on projects for select using ((status = 'published' and published_at <= now()) or (select is_admin()));

-- ─── app settings: one row ────────────────────────────────────────────────────────────────────────
create table app_settings (
  id boolean primary key default true check (id),
  data_tools_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into app_settings default values;

-- ─── audit log: who changed what, written by the database itself ──────────────────────────────────
create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null check (action in ('created', 'updated', 'deleted', 'event')),
  entity text not null,
  entity_id text,
  summary text not null default ''
);
create index audit_log_at_idx on audit_log (at desc);

create function log_change() returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  j jsonb := to_jsonb(coalesce(new, old));
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
begin
  -- Only real people's changes: seeds and the page-view counter have no signed-in user.
  if (select auth.uid()) is null then return coalesce(new, old); end if;
  if tg_table_name = 'posts' and tg_op = 'UPDATE' and (j - 'views' - 'updated_at') = (o - 'views' - 'updated_at') then return new; end if;
  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, summary)
  values (
    (select auth.uid()), (select auth.jwt() ->> 'email'),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    tg_table_name, coalesce(j ->> 'id', j ->> 'slug'),
    coalesce(j ->> 'title', j ->> 'name', j ->> 'label', j ->> 'role', j ->> 'author_name', j ->> 'display_name', j ->> 'slug', 'settings')
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts', 'projects', 'profile', 'socials', 'skills', 'tools', 'career', 'testimonials', 'post_categories', 'project_categories', 'skill_groups', 'app_settings']
  loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function log_change()', t || '_audit', t);
  end loop;
end $$;

-- Things that are not table rows (user management done with the Auth API) are recorded through this.
create function log_event(p_entity text, p_summary text) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.audit_log (actor_id, actor_email, action, entity, summary)
  values ((select auth.uid()), (select auth.jwt() ->> 'email'), 'event', left(p_entity, 40), left(p_summary, 300));
end $$;

-- Who is an admin, when they last signed in, and whether they have a second factor. Admins only.
create function admin_status() returns table (user_id uuid, email text, last_sign_in_at timestamptz, created_at timestamptz, mfa_enabled boolean)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.email::text, u.last_sign_in_at, u.created_at,
         exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')
  from public.admins a join auth.users u on u.id = a.user_id
  where (select public.is_admin())
  order by u.created_at;
$$;

-- Promote or demote an admin, never the last one and never yourself.
create function set_admin_flag(target uuid, make boolean) returns void language plpgsql security definer set search_path = ''
as $$
declare who text;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select email into who from auth.users where id = target;
  if who is null then raise exception 'No such user'; end if;
  if make then
    insert into public.admins (user_id) values (target) on conflict do nothing;
  else
    if target = (select auth.uid()) then raise exception 'You cannot remove your own admin access.'; end if;
    if (select count(*) from public.admins) <= 1 then raise exception 'There must be at least one admin.'; end if;
    delete from public.admins where user_id = target;
  end if;
  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, summary)
  values ((select auth.uid()), (select auth.jwt() ->> 'email'), 'event', 'admins', target::text, case when make then 'Made ' || who || ' an admin' else 'Removed admin access from ' || who end);
end $$;

revoke all on function log_event(text, text), admin_status(), set_admin_flag(uuid, boolean) from public, anon;
grant execute on function log_event(text, text), admin_status(), set_admin_flag(uuid, boolean) to authenticated;

-- ─── row level security for the new tables ────────────────────────────────────────────────────────
alter table post_categories enable row level security;
alter table project_categories enable row level security;
alter table skill_groups enable row level security;
alter table app_settings enable row level security;
alter table audit_log enable row level security;

create policy "read post categories" on post_categories for select using (true);
create policy "read project categories" on project_categories for select using (true);
create policy "read skill groups" on skill_groups for select using (true);
create policy "admin writes post categories" on post_categories for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes project categories" on project_categories for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes skill groups" on skill_groups for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin reads settings" on app_settings for select to authenticated using ((select is_admin()));
create policy "admin writes settings" on app_settings for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin reads audit log" on audit_log for select to authenticated using ((select is_admin()));

-- the media library lists files
create policy "admin lists media" on storage.objects for select to authenticated using (bucket_id = 'media' and (select is_admin()));
