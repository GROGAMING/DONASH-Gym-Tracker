-- Migration: Session targeting — assign sessions to all or selected team members
-- Safe to re-run (idempotent).
--
-- Design:
--   weekly_sessions gets assignment_type text DEFAULT 'all' ('all' | 'selected').
--   Per-player assignments are stored in the existing assigned_sessions join table
--   (weekly_session_id, user_id) — one row per selected player.
--
-- Backwards compatibility: existing rows default to assignment_type = 'all'
-- so they remain visible to every team member with no data changes needed.
--
-- NOTE: If assigned_user_ids uuid[] was previously added by a failed migration run,
-- this script removes it so the schema is clean.

-- 1. Add assignment_type to weekly_sessions (idempotent)
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'all';

-- 2. Constrain to the two valid values (drop first so re-runs are safe)
ALTER TABLE public.weekly_sessions
  DROP CONSTRAINT IF EXISTS weekly_sessions_assignment_type_check;

ALTER TABLE public.weekly_sessions
  ADD CONSTRAINT weekly_sessions_assignment_type_check
    CHECK (assignment_type IN ('all', 'selected'));

-- 3. Backfill: any existing rows should be treated as team-wide
UPDATE public.weekly_sessions
  SET assignment_type = 'all'
  WHERE assignment_type IS NULL;

-- 4. Remove the incorrect uuid[] column if a previous migration run added it
ALTER TABLE public.weekly_sessions
  DROP COLUMN IF EXISTS assigned_user_ids;

-- 5. Create assigned_sessions join table if it doesn't already exist
--    Links a weekly_session to specific users when assignment_type = 'selected'.
--    ON DELETE CASCADE on both FKs keeps the table self-cleaning.
CREATE TABLE IF NOT EXISTS public.assigned_sessions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_session_id  uuid        NOT NULL REFERENCES public.weekly_sessions(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assigned_sessions_session_user_unique UNIQUE (weekly_session_id, user_id)
);

CREATE INDEX IF NOT EXISTS assigned_sessions_session_idx
  ON public.assigned_sessions(weekly_session_id);

CREATE INDEX IF NOT EXISTS assigned_sessions_user_idx
  ON public.assigned_sessions(user_id);
