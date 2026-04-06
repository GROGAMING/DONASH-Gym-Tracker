-- ============================================================
-- Leaderboard RPC functions — canonical version
-- Safe to re-run (idempotent DROP + CREATE OR REPLACE).
--
-- KEY DESIGN DECISIONS:
-- 1. p_week_start is TEXT (not date) — Supabase-js serialises JS strings
--    as JSON text; using date causes Postgres overload ambiguity errors.
-- 2. Weekly filter uses snapshot_week_start = p_week_start (direct text
--    match) rather than a completed_at range. snapshot_week_start is
--    written at log time from weekly_sessions.week_start so it is
--    timezone-immune and exactly what the old working function used.
-- 3. Both functions use is_draft IS NOT TRUE (not = false) so legacy rows
--    where is_draft IS NULL (created before the column existed) are
--    correctly counted as completed.
-- 4. p_team_id is accepted as an optional param (DEFAULT NULL) to satisfy
--    callers that pass it (LeaderboardScreen, admin API) without breaking
--    callers that don't (report page). It is unused in the query because
--    this is a single-team deployment.
-- ============================================================

-- Drop ALL possible overload combinations to eliminate ambiguity
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text, text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date, text);
DROP FUNCTION IF EXISTS public.get_leaderboard_overall();
DROP FUNCTION IF EXISTS public.get_leaderboard_overall(text);

-- ── Weekly leaderboard ───────────────────────────────────────────────────────
-- Returns one row per user with the count of completed sessions whose
-- snapshot_week_start equals p_week_start (e.g. '2026-03-30').
CREATE OR REPLACE FUNCTION public.get_leaderboard_week(
  p_week_start text,
  p_team_id    text DEFAULT NULL
)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    u.name,
    COUNT(psl.id) AS count
  FROM public.users u
  LEFT JOIN public.player_session_logs psl
    ON  psl.player_id          = u.id
    AND psl.is_draft            IS NOT TRUE
    AND psl.completed_at        IS NOT NULL
    AND psl.snapshot_week_start = p_week_start
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;

-- ── Overall leaderboard ──────────────────────────────────────────────────────
-- Returns one row per user with their all-time completed session count.
CREATE OR REPLACE FUNCTION public.get_leaderboard_overall(
  p_team_id text DEFAULT NULL
)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    u.name,
    COUNT(psl.id) AS count
  FROM public.users u
  LEFT JOIN public.player_session_logs psl
    ON  psl.player_id    = u.id
    AND psl.is_draft      IS NOT TRUE
    AND psl.completed_at  IS NOT NULL
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;
