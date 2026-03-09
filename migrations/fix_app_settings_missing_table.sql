-- Ensure app_settings table exists with the correct minimal schema.
-- Safe to run multiple times (idempotent).

create table if not exists public.app_settings (
  key        text primary key,
  value_int  int  not null default 3,
  updated_at timestamptz not null default now()
);

-- Seed the required_sessions_weekly row if it does not exist yet.
insert into public.app_settings (key, value_int)
values ('required_sessions_weekly', 3)
on conflict (key) do nothing;

-- Grant the service-role full access (bypasses RLS by default, but be explicit).
grant all on public.app_settings to service_role;

-- If RLS is enabled on this table, add a permissive policy for the service role
-- so the API routes (which use the service-role key) can always read/write.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_settings' and c.relrowsecurity = true
  ) then
    -- drop any conflicting policy first
    drop policy if exists "service_role_all" on public.app_settings;
    create policy "service_role_all" on public.app_settings
      as permissive for all to service_role using (true) with check (true);
  end if;
end;
$$;
