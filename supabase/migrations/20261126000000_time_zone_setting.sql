-- The time zone the admin counts days in, chosen in Settings. Empty means "use the site's own" (owner.timeZone in src/content/site.ts).
alter table app_settings add column timezone text check (timezone is null or char_length(timezone) between 1 and 64);
