-- Create app_settings table if not exists
create table if not exists public.app_settings (
  key text primary key,
  value_int int not null,
  updated_at timestamptz not null default now()
);

-- Insert seed row if not exists
insert into public.app_settings(key, value_int)
values ('required_sessions_weekly', 3)
on conflict (key) do nothing;
