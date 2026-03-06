-- Migration: Global exercise library support
-- Makes exercise_library.team_id nullable so that:
--   team_id IS NULL  = global/shared exercise (visible to all teams)
--   team_id = <id>   = team-specific custom exercise (visible only to that team)
--
-- Safe to run multiple times (idempotent).

-- 1. Drop the old (team_id, name) unique constraint and index
--    (team_id will become nullable so we need a new constraint strategy)
ALTER TABLE public.exercise_library
  DROP CONSTRAINT IF EXISTS exercise_library_team_name_unique;

DROP INDEX IF EXISTS exercise_library_team_idx;

-- 2. Make team_id nullable
ALTER TABLE public.exercise_library
  ALTER COLUMN team_id DROP NOT NULL;

-- 3. Add a new unique constraint that works with NULLs.
--    PostgreSQL NULLs are never equal, so (NULL, 'Squat') and (NULL, 'Squat')
--    would not conflict under a plain UNIQUE constraint.
--    We use a partial unique index instead:
--      - one index for global exercises (team_id IS NULL)
--      - one index for team-specific exercises (team_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS exercise_library_global_name_unique
  ON public.exercise_library (name)
  WHERE team_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS exercise_library_team_name_unique
  ON public.exercise_library (team_id, name)
  WHERE team_id IS NOT NULL;

-- 4. Add a general lookup index
CREATE INDEX IF NOT EXISTS exercise_library_team_idx
  ON public.exercise_library (team_id, name);

-- 5. Promote the 25 standard seed exercises to global (team_id = NULL).
--
--    Strategy: insert them as global rows if they don't exist globally yet.
--    The existing team-scoped rows are left untouched.
--    The application query returns global OR team rows and deduplicates by name
--    (preferring the team-specific row when both exist), so the original team
--    will not see duplicates.
--
--    If you later want to clean up the now-redundant team-scoped copies of these
--    standard exercises you can delete them by name, but it is safe to leave them.

INSERT INTO public.exercise_library (team_id, name) VALUES
  (NULL, 'Squat'),
  (NULL, 'Bench Press'),
  (NULL, 'Deadlift'),
  (NULL, 'Overhead Press'),
  (NULL, 'Barbell Row'),
  (NULL, 'Pull-Up'),
  (NULL, 'Dip'),
  (NULL, 'Lunge'),
  (NULL, 'Romanian Deadlift'),
  (NULL, 'Leg Press'),
  (NULL, 'Leg Curl'),
  (NULL, 'Leg Extension'),
  (NULL, 'Calf Raise'),
  (NULL, 'Incline Bench Press'),
  (NULL, 'Cable Row'),
  (NULL, 'Lat Pulldown'),
  (NULL, 'Face Pull'),
  (NULL, 'Bicep Curl'),
  (NULL, 'Tricep Pushdown'),
  (NULL, 'Lateral Raise'),
  (NULL, 'Hip Thrust'),
  (NULL, 'Plank'),
  (NULL, 'Ab Wheel Rollout'),
  (NULL, 'Box Jump'),
  (NULL, 'Farmers Walk')
ON CONFLICT DO NOTHING;
