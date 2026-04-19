-- Migration: Session targeting — assign sessions to all or selected users
-- Safe to re-run (idempotent).
--
-- Real confirmed schema (from Supabase screenshots):
--   weekly_sessions : id, team_id, template_id, week_start, session_date, notes, created_at
--   assigned_sessions : id, template_id, week_start, created_at  (+ team_id assumed)
--   users : id, name, team_id
--
-- Minimum additions required:
--   1. weekly_sessions.assignment_type  text DEFAULT 'all'
--        Controls whether this session row is for all users or selected users only.
--   2. assigned_sessions.user_id  uuid DEFAULT NULL
--        NULL  = the existing behaviour (whole team assigned via this row)
--        uuid  = only that specific user is assigned
--
-- Backwards compatibility:
--   All existing weekly_sessions rows get assignment_type = 'all' (default).
--   All existing assigned_sessions rows keep user_id = NULL — unchanged behaviour.
--
-- Cleanup: remove any columns added by earlier bad migration attempts.

-- 1. Remove incorrect columns added by previous bad migrations (safe if not present)
ALTER TABLE public.weekly_sessions
  DROP COLUMN IF EXISTS assigned_user_ids;

-- 2. Add assignment_type to weekly_sessions
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'all';

-- 3. Constrain assignment_type values (drop first so re-runs are safe)
ALTER TABLE public.weekly_sessions
  DROP CONSTRAINT IF EXISTS weekly_sessions_assignment_type_check;

ALTER TABLE public.weekly_sessions
  ADD CONSTRAINT weekly_sessions_assignment_type_check
    CHECK (assignment_type IN ('all', 'selected'));

-- 4. Backfill existing rows to 'all'
UPDATE public.weekly_sessions
  SET assignment_type = 'all'
  WHERE assignment_type IS NULL;

-- 5. Add user_id to assigned_sessions (nullable — NULL means whole team)
ALTER TABLE public.assigned_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT NULL;

-- 6. Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS assigned_sessions_user_idx
  ON public.assigned_sessions(user_id)
  WHERE user_id IS NOT NULL;
