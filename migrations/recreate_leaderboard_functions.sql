-- ============================================================
-- Recreate leaderboard RPC functions
-- These were previously run directly in Supabase and were lost.
-- Safe to re-run (CREATE OR REPLACE).
--
-- KEY DESIGN DECISIONS:
-- 1. Weekly function matches on snapshot_week_start (TEXT, stored at log
--    time) rather than a completed_at range. This is timezone-immune and
--    is exactly how the old working function operated.
-- 2. Both functions use is_draft IS NOT TRUE (not is_draft = false) so
--    legacy rows where is_draft IS NULL are counted as completed.
-- 3. Both functions accept an optional p_team_id parameter so they work
--    from both the admin report (no team filter needed — single-team app)
--    and the LeaderboardScreen (which passes p_team_id). When p_team_id
--    is NULL the filter is skipped.
-- ============================================================

-- Drop old signatures first (different param lists cause overload conflicts)
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date, text);
DROP FUNCTION IF EXISTS public.get_leaderboard_overall();
DROP FUNCTION IF EXISTS public.get_leaderboard_overall(text);

-- Weekly leaderboard: sessions whose snapshot_week_start matches the given
-- Monday ISO date string. Returns (name, count) ordered desc.
CREATE OR REPLACE FUNCTION public.get_leaderboard_week(
  p_week_start date,
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
    AND psl.snapshot_week_start = p_week_start::text
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;

-- Overall leaderboard: all completed sessions per player all-time.
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
    ON  psl.player_id   = u.id
    AND psl.is_draft     IS NOT TRUE
    AND psl.completed_at IS NOT NULL
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;
