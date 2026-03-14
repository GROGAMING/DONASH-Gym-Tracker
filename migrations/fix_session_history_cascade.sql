-- ============================================================
-- Fix: session history permanently preserved
-- ============================================================
-- ROOT CAUSE: player_session_logs.weekly_session_id had
-- ON DELETE CASCADE, so deleting any weekly_sessions row
-- (e.g. admin "Remove" button) silently wiped all completed
-- player_session_logs and player_set_logs referencing it.
--
-- FIX PART 1: Change the FK to ON DELETE SET NULL so that
-- removing a weekly_sessions row orphans the log row (sets
-- weekly_session_id = NULL) instead of deleting it.
-- weekly_session_id must become nullable to allow this.
--
-- FIX PART 2: Add snapshot columns to player_session_logs so
-- history never depends on weekly_sessions existing:
--   - snapshot_week_start   TEXT  (YYYY-MM-DD, copied at log time)
--   - snapshot_template_title TEXT (template title at log time)
--
-- All changes are idempotent / safe to re-run.
-- ============================================================

-- 1. Drop the existing FK constraint (name may vary; use DO block for safety)
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM   pg_constraint
  WHERE  conrelid = 'public.player_session_logs'::regclass
    AND  contype  = 'f'
    AND  confrelid = 'public.weekly_sessions'::regclass;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.player_session_logs DROP CONSTRAINT %I', v_constraint);
  END IF;
END
$$;

-- 2. Make weekly_session_id nullable (required for ON DELETE SET NULL)
ALTER TABLE public.player_session_logs
  ALTER COLUMN weekly_session_id DROP NOT NULL;

-- 3. Re-add the FK with ON DELETE SET NULL
--    (orphans the log when a weekly_sessions row is removed — history is preserved)
ALTER TABLE public.player_session_logs
  ADD CONSTRAINT player_session_logs_weekly_session_id_fkey
  FOREIGN KEY (weekly_session_id)
  REFERENCES public.weekly_sessions(id)
  ON DELETE SET NULL;

-- 4. Add snapshot columns (idempotent)
ALTER TABLE public.player_session_logs
  ADD COLUMN IF NOT EXISTS snapshot_week_start     text null,
  ADD COLUMN IF NOT EXISTS snapshot_template_title text null;

-- 5. Backfill snapshot columns from the still-existing weekly_sessions rows
--    (only fills rows where snapshots are currently null but the FK still resolves)
UPDATE public.player_session_logs psl
SET
  snapshot_week_start     = ws.week_start,
  snapshot_template_title = st.title
FROM public.weekly_sessions ws
LEFT JOIN public.session_templates st ON st.id = ws.template_id
WHERE psl.weekly_session_id = ws.id
  AND (psl.snapshot_week_start IS NULL OR psl.snapshot_template_title IS NULL);

-- 6. Index to support history queries by player quickly
CREATE INDEX IF NOT EXISTS player_session_logs_player_completed_idx
  ON public.player_session_logs(player_id, completed_at DESC NULLS LAST);
