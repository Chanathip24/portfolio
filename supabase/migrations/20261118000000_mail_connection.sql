-- The one Gmail connection of the site: the OAuth client the owner registered in Google Cloud, and (once they press Connect) the
-- refresh token. Secrets are stored encrypted by the app. Row level security is on with NO policies, so only the server's
-- service key can touch this table: neither visitors nor signed-in admins can read it through the API.
create table mail_connection (
  id boolean primary key default true check (id),
  client_id text not null default '' check (char_length(client_id) <= 300),
  client_secret_enc text not null default '',
  refresh_token_enc text,
  account_email text,
  connected_at timestamptz,
  expired boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into mail_connection (id) values (true);
alter table mail_connection enable row level security;
revoke all on mail_connection from anon, authenticated;
