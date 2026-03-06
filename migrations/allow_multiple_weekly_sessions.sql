-- Allow multiple sessions per week by dropping the unique constraint
-- on (team_id, week_start) in weekly_sessions and adding a slot column.

-- Drop the unique constraint if it exists (constraint name may vary)
ALTER TABLE public.weekly_sessions
  DROP CONSTRAINT IF EXISTS weekly_sessions_team_id_week_start_key;

-- Add slot column to order multiple sessions within the same week
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS slot integer NOT NULL DEFAULT 1;
