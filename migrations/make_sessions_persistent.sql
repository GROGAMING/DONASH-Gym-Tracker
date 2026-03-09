-- Make session assignments persistent (not week-scoped)
-- Idempotent: safe to run multiple times

-- Add is_active flag (true = currently assigned, false = unassigned/removed)
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add assigned_at timestamp for display in admin UI
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();

-- Backfill: mark all existing rows as active
UPDATE public.weekly_sessions
  SET is_active = true
  WHERE is_active IS NULL;

-- Index for fast active-session lookups
CREATE INDEX IF NOT EXISTS weekly_sessions_team_active_idx
  ON public.weekly_sessions(team_id, is_active)
  WHERE is_active = true;
