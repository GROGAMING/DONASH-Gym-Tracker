-- Migration: Persistent template assignments with per-week session instances
-- Safe to run multiple times (idempotent).

-- 1. Table that stores which templates are currently assigned to a team.
--    Rows persist until admin explicitly removes them.
--    One row per (team_id, template_id) — no duplicates.
create table if not exists public.active_template_assignments (
  id          uuid primary key default gen_random_uuid(),
  team_id     text not null,
  template_id uuid not null,
  created_at  timestamptz not null default now(),
  constraint active_template_assignments_team_template_unique unique (team_id, template_id)
);

create index if not exists active_template_assignments_team_idx
  on public.active_template_assignments(team_id);

-- 2. Add a unique index on weekly_sessions(team_id, template_id, week_start)
--    so that upsert logic can guarantee one instance per template per week.
--    (The old unique constraint on (team_id, week_start) was already dropped by
--    allow_multiple_weekly_sessions.sql.)
DROP INDEX IF EXISTS weekly_sessions_team_template_week_unique;

CREATE UNIQUE INDEX IF NOT EXISTS weekly_sessions_team_template_week_unique
  ON public.weekly_sessions (team_id, template_id, week_start)
  WHERE template_id IS NOT NULL;

-- 3. Migrate existing weekly_sessions rows into active_template_assignments
--    so current admins don't lose their active assignments.
--    For each team+template combination, take the most recent row.
INSERT INTO public.active_template_assignments (team_id, template_id, created_at)
SELECT DISTINCT ON (team_id, template_id)
  team_id,
  template_id,
  created_at
FROM public.weekly_sessions
WHERE template_id IS NOT NULL
ORDER BY team_id, template_id, created_at DESC
ON CONFLICT (team_id, template_id) DO NOTHING;
