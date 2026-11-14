-- Public ingestion must pass through validated server routes, never the publishable key.
drop policy if exists "anyone logs a view" on public.page_views;
drop policy if exists "visitors send contact messages" on public.messages;
drop policy if exists "visitors add vitals" on public.web_vitals;
revoke insert on public.page_views, public.messages, public.web_vitals from anon, authenticated;

-- Atomically reserve a contact quota before inserting. Hashes only; no raw email or network address.
create or replace function public.reserve_contact(p_email text, p_network text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('contact-quota', 0));
  if (select count(*) from auth_attempts where kind = 'contact-email' and key = p_email and at > now() - interval '1 hour') >= 3
     or (select count(*) from auth_attempts where kind = 'contact-network' and key = p_network and at > now() - interval '1 hour') >= 20 then
    return false;
  end if;
  insert into auth_attempts(kind, key) values ('contact-email', p_email), ('contact-network', p_network);
  return true;
end;
$$;
revoke all on function public.reserve_contact(text, text) from public, anon, authenticated;
grant execute on function public.reserve_contact(text, text) to service_role;
