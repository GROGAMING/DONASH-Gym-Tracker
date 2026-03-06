-- Player session logging tables (idempotent)

create table if not exists public.player_session_logs (
  id                uuid primary key default gen_random_uuid(),
  team_id           text not null,
  weekly_session_id uuid not null references public.weekly_sessions(id) on delete cascade,
  player_id         uuid not null,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz null,
  is_draft          boolean not null default false
);

create index if not exists player_session_logs_team_week_idx
  on public.player_session_logs(team_id, weekly_session_id);

create index if not exists player_session_logs_player_created_idx
  on public.player_session_logs(player_id, created_at desc);

-- draft lookup: one draft per player per weekly session
create unique index if not exists player_session_logs_draft_unique
  on public.player_session_logs(player_id, weekly_session_id)
  where is_draft = true;

create table if not exists public.player_set_logs (
  id                    uuid primary key default gen_random_uuid(),
  team_id               text not null,
  player_session_log_id uuid not null references public.player_session_logs(id) on delete cascade,
  exercise_id           uuid null,
  exercise_name         text not null,
  set_number            int  not null,
  reps                  int  null,
  weight                numeric null,
  created_at            timestamptz not null default now()
);

create index if not exists player_set_logs_session_idx
  on public.player_set_logs(player_session_log_id, set_number);

create index if not exists player_set_logs_exercise_idx
  on public.player_set_logs(exercise_id, created_at desc);
