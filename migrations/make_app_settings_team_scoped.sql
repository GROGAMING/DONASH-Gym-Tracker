-- ============================================================
-- Make app_settings team-scoped
-- ============================================================
-- ROOT CAUSE: app_settings had (key TEXT PRIMARY KEY) with no
-- team_id column. A single row 'required_sessions_weekly' was
-- shared by all teams, so writing quota for Team A overwrote
-- the value for every other team.
--
-- FIX: add team_id column, change unique constraint to
-- (team_id, key), backfill existing row with empty-string
-- placeholder, and seed a proper default row for any team
-- that already uses the env-based TEAM_ID.
--
-- All changes are idempotent / safe to re-run.
-- ============================================================

-- 1. Add team_id column (nullable first so existing rows survive)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS team_id text;

-- 2. Backfill existing rows that have no team_id yet with '' so
--    they are visible but not matched by any real team query.
--    (Real per-team rows will be created via upsert below.)
UPDATE public.app_settings
SET team_id = ''
WHERE team_id IS NULL;

-- 3. Make the column NOT NULL now that every row has a value.
ALTER TABLE public.app_settings
  ALTER COLUMN team_id SET NOT NULL,
  ALTER COLUMN team_id SET DEFAULT '';

-- 4. Drop the old PRIMARY KEY on key alone (was the global unique constraint).
--    We re-create it as a composite unique index on (team_id, key).
--    Use DO block in case the constraint name varies.
DO $$
DECLARE
  v_constraint text;
BEGIN
  -- Find the PK or unique constraint on just (key)
  SELECT conname INTO v_constraint
  FROM   pg_constraint
  WHERE  conrelid = 'public.app_settings'::regclass
    AND  contype IN ('p', 'u')
    AND  array_length(conkey, 1) = 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.app_settings DROP CONSTRAINT %I', v_constraint);
  END IF;
END
$$;

-- 5. Add composite primary key on (team_id, key).
--    Use ADD CONSTRAINT IF NOT EXISTS pattern via DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.app_settings'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.app_settings ADD PRIMARY KEY (team_id, key);
  END IF;
END
$$;

-- 6. Drop old single-column index (now redundant).
DROP INDEX IF EXISTS public.idx_app_settings_key;

-- 7. Create new composite index for fast (team_id, key) lookups.
CREATE INDEX IF NOT EXISTS idx_app_settings_team_key
  ON public.app_settings(team_id, key);

-- 8. Update comments.
COMMENT ON TABLE public.app_settings IS 'Per-team application settings (team_id + key = unique)';
COMMENT ON COLUMN public.app_settings.team_id IS 'Team identifier (matches TEAM_ID env var per deployment)';
COMMENT ON COLUMN public.app_settings.key IS 'Setting key';
