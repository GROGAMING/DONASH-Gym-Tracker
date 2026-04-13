-- Migration: Session targeting — assign sessions to all or selected team members
-- Safe to re-run (idempotent).
--
-- Adds two columns to weekly_sessions:
--   assignment_type   text    DEFAULT 'all'  — 'all' | 'selected'
--   assigned_user_ids uuid[]  DEFAULT NULL   — populated when assignment_type = 'selected'
--
-- Backwards compatibility: existing rows have assignment_type = 'all' by default
-- so they remain visible to everyone on the team.

ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assignment_type   text    NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS assigned_user_ids uuid[]  DEFAULT NULL;

-- Constrain to the two valid values
ALTER TABLE public.weekly_sessions
  DROP CONSTRAINT IF EXISTS weekly_sessions_assignment_type_check;

ALTER TABLE public.weekly_sessions
  ADD CONSTRAINT weekly_sessions_assignment_type_check
    CHECK (assignment_type IN ('all', 'selected'));
