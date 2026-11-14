-- Housekeeping found by measuring the admin's queries at 300k page views and 200k audit rows (RLS itself cost nothing: every
-- policy already calls (select is_admin()), so it runs once per query).

-- Foreign keys with no index: deleting a category, author or profile had to scan the child table to check for rows using it.
create index posts_category_idx on posts (category);
create index posts_author_idx on posts (author_id);
create index skills_group_idx on skills ("group");
create index socials_profile_idx on socials (profile_id);

-- Two indexes made redundant by wider ones that start with the same column: they only cost space and slow every insert.
drop index audit_log_actor_idx;  -- audit_log_actor_at_idx (actor_email, at desc)
drop index page_views_path_idx;  -- page_views_path_created_idx (path, created_at desc)

-- Admin-only reads and writes were open to every role, so a signed-out request still ran the admin check. Nobody signed out can
-- be an admin, so limit them to signed-in users.
alter policy "admin reads messages" on messages to authenticated;
alter policy "admin updates messages" on messages to authenticated;
alter policy "admin deletes messages" on messages to authenticated;
alter policy "admin reads errors" on error_events to authenticated;
alter policy "admin clears errors" on error_events to authenticated;
alter policy "admin reads revisions" on revisions to authenticated;
alter policy "admin reads vitals" on web_vitals to authenticated;
