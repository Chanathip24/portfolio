-- Portfolio schema. Public visitors read published content; only an admin (allow-listed user who has
-- signed in WITH a second factor, aal2) can write. Row Level Security is the real gate: the app code
-- checks too, but nothing here depends on it.

-- ─── enums (mirror src/lib/enums.ts) ──────────────────────────────────────────────────────────────
create type publish_status as enum ('draft', 'published', 'archived');
create type post_category as enum ('engineering', 'design', 'data', 'process');
create type project_tag as enum ('Product', 'Sync', 'Postgres', 'API', 'Payments');
create type skill_group as enum ('frontend', 'backend', 'data', 'tooling');
create type tool_key as enum ('typescript', 'react', 'nextjs', 'nodejs', 'postgres', 'supabase', 'tailwind', 'docker', 'git', 'figma', 'vercel', 'rust', 'redis', 'graphql');
create type social_platform as enum ('github', 'linkedin', 'x', 'youtube', 'bluesky', 'email');
create type career_kind as enum ('education', 'work', 'freelance');

-- ─── admins ───────────────────────────────────────────────────────────────────────────────────────
-- Add yourself after creating your user:  insert into admins (user_id) values ('<auth.users id>');
create table admins (user_id uuid primary key references auth.users (id) on delete cascade);
alter table admins enable row level security; -- no policies: only is_admin() below can read it

-- True only for an allow-listed user whose session passed MFA. Security definer so it can read `admins`.
create function is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated;

-- ─── content tables ───────────────────────────────────────────────────────────────────────────────
create table authors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  role text not null default '' check (char_length(role) <= 120),
  bio text not null default '' check (char_length(bio) <= 600),
  avatar_url text,
  profile_href text
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 96),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  category post_category not null default 'engineering',
  status publish_status not null default 'draft',
  reading_minutes int not null default 1 check (reading_minutes between 1 and 240),
  image_url text not null default '',
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid not null references authors (id),
  views int not null default 0 check (views >= 0),
  body jsonb not null default '{"type":"doc","content":[]}'
);
create index posts_status_published_idx on posts (status, published_at desc);

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 96),
  title text not null check (char_length(title) between 1 and 160),
  client text not null default '' check (char_length(client) <= 120),
  tags project_tag[] not null default '{}',
  status publish_status not null default 'draft',
  is_signature boolean not null default false,
  sort_order int not null default 0,
  image_url text not null default '',
  summary text not null default '' check (char_length(summary) <= 500),
  live_url text,
  preview_url text,
  body jsonb not null default '{"type":"doc","content":[]}',
  created_at timestamptz not null default now()
);

-- One row only: the singleton column is unique and always true.
create table profile (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  display_name text not null check (char_length(display_name) between 1 and 120),
  role text not null default '' check (char_length(role) <= 120),
  location text not null default '' check (char_length(location) <= 120),
  headline text not null default '' check (char_length(headline) <= 240),
  status_note text not null default '' check (char_length(status_note) <= 240),
  years_experience int not null default 0 check (years_experience between 0 and 80),
  image_url text not null default '',
  bio jsonb not null default '{"type":"doc","content":[]}'
);

create table socials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profile (id) on delete cascade,
  platform social_platform not null,
  label text not null check (char_length(label) between 1 and 60),
  handle text not null check (char_length(handle) <= 120),
  url text not null check (url ~ '^(https?://|mailto:)'),
  sort_order int not null default 0
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  "group" skill_group not null,
  years int not null default 0 check (years between 0 and 60),
  note text not null default '' check (char_length(note) <= 240),
  sort_order int not null default 0
);

create table tools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  tool_key tool_key not null,
  sort_order int not null default 0
);

create table career (
  id uuid primary key default gen_random_uuid(),
  kind career_kind not null,
  role text not null check (char_length(role) between 1 and 120),
  organisation text not null check (char_length(organisation) between 1 and 120),
  location text not null default '' check (char_length(location) <= 120),
  start_year int not null check (start_year between 1950 and 2100),
  end_year int check (end_year between 1950 and 2100),
  summary text not null default '' check (char_length(summary) <= 500),
  highlights text[] not null default '{}',
  sort_order int not null default 0
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 1 and 600),
  author_name text not null check (char_length(author_name) between 1 and 120),
  author_role text not null default '' check (char_length(author_role) <= 120),
  company text not null default '' check (char_length(company) <= 120),
  avatar_url text,
  sort_order int not null default 0
);

create function touch_updated_at() returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
create trigger posts_touch before update on posts for each row execute function touch_updated_at();

-- ─── analytics ────────────────────────────────────────────────────────────────────────────────────
-- Cookie-less and privacy-friendly: `visitor` is a salted, daily-rotating hash made by the server (see
-- src/app/api/track/route.ts); there is no IP, user agent or user id in this table.
create table page_views (
  id bigint generated always as identity primary key,
  path text not null check (path like '/%' and char_length(path) <= 300),
  referrer text check (char_length(referrer) <= 300),
  visitor text not null check (char_length(visitor) <= 64),
  created_at timestamptz not null default now()
);
create index page_views_created_idx on page_views (created_at desc);
create index page_views_path_idx on page_views (path);

-- Keeps posts.views (shown on the blog) in step with the log.
create function bump_post_views() returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.path like '/blog/%' then
    update public.posts set views = views + 1 where slug = substr(new.path, 7) and status = 'published';
  end if;
  return new;
end $$;
create trigger page_views_bump after insert on page_views for each row execute function bump_post_views();

-- One round trip for the whole dashboard. Security invoker: RLS decides who may call it (admins only).
create function analytics_summary(days int default 30) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with v as (
    select * from public.page_views where created_at >= now() - make_interval(days => least(greatest(days, 1), 365))
  )
  select jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by d.day)
      from generate_series(current_date - (least(greatest(days, 1), 365) - 1), current_date, '1 day') as d(day)
      left join (select created_at::date as day, count(*) as views, count(distinct visitor) as visitors from v group by 1) c on c.day = d.day::date
    ), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v group by path order by views desc limit 10) t), '[]'::jsonb),
    'top_referrers', coalesce((select jsonb_agg(t) from (select referrer, count(*) as views from v where referrer is not null and referrer <> '' group by referrer order by views desc limit 8) t), '[]'::jsonb)
  );
$$;

-- ─── row level security ───────────────────────────────────────────────────────────────────────────
alter table authors enable row level security;
alter table posts enable row level security;
alter table projects enable row level security;
alter table profile enable row level security;
alter table socials enable row level security;
alter table skills enable row level security;
alter table tools enable row level security;
alter table career enable row level security;
alter table testimonials enable row level security;
alter table page_views enable row level security;

-- Anyone reads published posts/projects and the About data; the admin reads everything.
create policy "read published posts" on posts for select using (status = 'published' or (select is_admin()));
create policy "read published projects" on projects for select using (status = 'published' or (select is_admin()));
create policy "read authors" on authors for select using (true);
create policy "read profile" on profile for select using (true);
create policy "read socials" on socials for select using (true);
create policy "read skills" on skills for select using (true);
create policy "read tools" on tools for select using (true);
create policy "read career" on career for select using (true);
create policy "read testimonials" on testimonials for select using (true);

-- Only the admin writes (insert/update/delete) to content.
create policy "admin writes posts" on posts for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes projects" on projects for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes authors" on authors for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes profile" on profile for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes socials" on socials for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes skills" on skills for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes tools" on tools for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes career" on career for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admin writes testimonials" on testimonials for all to authenticated using ((select is_admin())) with check ((select is_admin()));

-- Visitors may only append a view; only the admin reads them.
create policy "anyone logs a view" on page_views for insert to anon, authenticated with check (true);
create policy "admin reads views" on page_views for select to authenticated using ((select is_admin()));

-- ─── storage: public images, admin-only uploads ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do nothing;

create policy "admin uploads media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select is_admin()));
create policy "admin updates media" on storage.objects for update to authenticated using (bucket_id = 'media' and (select is_admin()));
create policy "admin deletes media" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select is_admin()));
