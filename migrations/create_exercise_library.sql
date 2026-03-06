-- Exercise library: shared pool of exercises per team
create table if not exists public.exercise_library (
  id          uuid primary key default gen_random_uuid(),
  team_id     text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  constraint exercise_library_team_name_unique unique (team_id, name)
);

create index if not exists exercise_library_team_idx
  on public.exercise_library(team_id, name);

-- Fix session_template_exercises: ensure `name` column exists and exercise_name is NOT enforced
-- If your DB still has exercise_name as NOT NULL, this makes it nullable and copies name into it
alter table public.session_template_exercises
  alter column exercise_name drop not null;

-- Seed common exercises (replace 'YOUR_TEAM_ID' with your actual team_id value before running)
-- Example seed — run after replacing the team_id:
-- insert into public.exercise_library (team_id, name) values
--   ('YOUR_TEAM_ID', 'Squat'),
--   ('YOUR_TEAM_ID', 'Bench Press'),
--   ('YOUR_TEAM_ID', 'Deadlift'),
--   ('YOUR_TEAM_ID', 'Overhead Press'),
--   ('YOUR_TEAM_ID', 'Barbell Row'),
--   ('YOUR_TEAM_ID', 'Pull-Up'),
--   ('YOUR_TEAM_ID', 'Dip'),
--   ('YOUR_TEAM_ID', 'Lunge'),
--   ('YOUR_TEAM_ID', 'Romanian Deadlift'),
--   ('YOUR_TEAM_ID', 'Leg Press'),
--   ('YOUR_TEAM_ID', 'Leg Curl'),
--   ('YOUR_TEAM_ID', 'Leg Extension'),
--   ('YOUR_TEAM_ID', 'Calf Raise'),
--   ('YOUR_TEAM_ID', 'Incline Bench Press'),
--   ('YOUR_TEAM_ID', 'Cable Row'),
--   ('YOUR_TEAM_ID', 'Lat Pulldown'),
--   ('YOUR_TEAM_ID', 'Face Pull'),
--   ('YOUR_TEAM_ID', 'Bicep Curl'),
--   ('YOUR_TEAM_ID', 'Tricep Pushdown'),
--   ('YOUR_TEAM_ID', 'Lateral Raise'),
--   ('YOUR_TEAM_ID', 'Hip Thrust'),
--   ('YOUR_TEAM_ID', 'Plank'),
--   ('YOUR_TEAM_ID', 'Ab Wheel Rollout'),
--   ('YOUR_TEAM_ID', 'Box Jump'),
--   ('YOUR_TEAM_ID', 'Farmers Walk')
-- on conflict (team_id, name) do nothing;
