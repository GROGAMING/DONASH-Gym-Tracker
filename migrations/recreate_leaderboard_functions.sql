-- ============================================================
-- Recreate leaderboard RPC functions
-- These were previously run directly in Supabase and were lost.
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

-- Weekly leaderboard: completed sessions per player in a 7-day window
-- starting on p_week_start (Monday). Returns (name, count) desc.
CREATE OR REPLACE FUNCTION public.get_leaderboard_week(p_week_start date)
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
    AND psl.is_draft     = false
    AND psl.completed_at IS NOT NULL
    AND psl.completed_at >= p_week_start::timestamptz
    AND psl.completed_at <  (p_week_start + interval '7 days')::timestamptz
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;

-- Overall leaderboard: all completed sessions per player all-time.
CREATE OR REPLACE FUNCTION public.get_leaderboard_overall()
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
    AND psl.is_draft     = false
    AND psl.completed_at IS NOT NULL
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;
