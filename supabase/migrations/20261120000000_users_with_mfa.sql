-- Who has a verified second factor, in one query. The user list used to ask Auth about every user one by one.
-- Server only: callable with the service key, not by visitors or signed-in users.
create function users_with_mfa() returns setof uuid
language sql stable security definer set search_path = ''
as $$ select distinct user_id from auth.mfa_factors where status = 'verified'; $$;
revoke execute on function users_with_mfa() from public, anon, authenticated;
grant execute on function users_with_mfa() to service_role;
