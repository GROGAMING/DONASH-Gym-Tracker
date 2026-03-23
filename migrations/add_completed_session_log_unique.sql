-- ============================================================
-- Add unique constraint on completed player_session_logs rows
-- ============================================================
-- ROOT CAUSE: player_session_logs_draft_unique is a PARTIAL
-- unique index covering only (player_id, weekly_session_id)
-- WHERE is_draft = true. There was no equivalent constraint
-- for completed rows (is_draft = false), so a race between a
-- rapid double-tap or a concurrent autosave-draft and
-- log-session request could insert two completed rows for the
-- same player + session. The subsequent .maybeSingle() check
-- in the log route then returns 2 rows -> PGRST116 error.
--
-- FIX: add a matching partial unique index for is_draft = false.
-- Idempotent / safe to re-run.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS player_session_logs_completed_unique
  ON public.player_session_logs(player_id, weekly_session_id)
  WHERE is_draft = false;
