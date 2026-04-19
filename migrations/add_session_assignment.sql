-- Migration: Session targeting — store assignment data directly on weekly_sessions.
-- Safe to re-run (idempotent).
--
-- Design decision:
--   assigned_sessions is not used by the app and has FK constraints that make it
--   unsuitable as a join table without schema redesign. Instead, store assignment
--   data directly on weekly_sessions:
--
--   weekly_sessions.assignment_type   text     DEFAULT 'all'  — 'all' | 'selected'
--   weekly_sessions.assigned_user_ids uuid[]   DEFAULT NULL   — populated when type = 'selected'
--
-- Backwards compatibility:
--   All existing weekly_sessions rows get assignment_type = 'all' by default,
--   so they remain visible to every team member with no data changes required.

-- 1. Add assignment_type (idempotent)
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'all';

-- 2. Constrain to the two valid values (drop+recreate so re-runs are safe)
ALTER TABLE public.weekly_sessions
  DROP CONSTRAINT IF EXISTS weekly_sessions_assignment_type_check;

ALTER TABLE public.weekly_sessions
  ADD CONSTRAINT weekly_sessions_assignment_type_check
    CHECK (assignment_type IN ('all', 'selected'));

-- 3. Add assigned_user_ids uuid array (idempotent)
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assigned_user_ids uuid[] DEFAULT NULL;

-- 4. Backfill: ensure no nulls on assignment_type for existing rows
UPDATE public.weekly_sessions
  SET assignment_type = 'all'
  WHERE assignment_type IS NULL;
