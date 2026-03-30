-- ============================================================
-- Fix leaderboard RPC functions to query player_session_logs
-- ============================================================
-- ROOT CAUSE: get_leaderboard_week and get_leaderboard_overall
-- were querying the `uploads` table (photo-upload sessions).
-- Session logging writes to `player_session_logs`, which is a
-- completely separate table. The two leaderboard functions never
-- saw new session logs, so the leaderboard never updated after
-- a player logged a session.
--
-- FIX: Redefine both functions to count completed, non-draft
-- rows from player_session_logs joined to users for the name.
--
--   get_leaderboard_week(p_week_start text):
--     counts logs where completed_at >= p_week_start (Monday)
--     and completed_at < p_week_start + 7 days (next Monday).
--
--   get_leaderboard_overall():
--     counts all completed, non-draft logs.
--
-- Both functions are SECURITY DEFINER so the anon client can
-- call them without RLS blocking the underlying table reads.
-- ============================================================

-- ── Weekly leaderboard ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text, text);
CREATE OR REPLACE FUNCTION public.get_leaderboard_week(p_week_start text, p_team_id text)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.name,
    COUNT(psl.id) AS count
  FROM public.users u
  LEFT JOIN public.player_session_logs psl
    ON  psl.player_id = u.id
    AND psl.team_id   = p_team_id
    AND (psl.is_draft = false OR psl.is_draft IS NULL)
    AND (
      -- Primary: use snapshot_week_start written at log time
      psl.snapshot_week_start = p_week_start
      OR
      -- Fallback: for older rows where snapshot is NULL, join weekly_sessions
      (psl.snapshot_week_start IS NULL
       AND EXISTS (
         SELECT 1 FROM public.weekly_sessions ws
         WHERE ws.id = psl.weekly_session_id
           AND ws.week_start = p_week_start
       ))
    )
  WHERE u.team_id = p_team_id
  GROUP BY u.name
  ORDER BY count DESC, u.name ASC;
$$;

-- ── All-time leaderboard ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_leaderboard_overall() CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard_overall(text);
CREATE OR REPLACE FUNCTION public.get_leaderboard_overall(p_team_id text)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.name,
    COUNT(psl.id) AS count
  FROM public.users u
  LEFT JOIN public.player_session_logs psl
    ON  psl.player_id = u.id
    AND psl.team_id   = p_team_id
    AND (psl.is_draft = false OR psl.is_draft IS NULL)
  WHERE u.team_id = p_team_id
  GROUP BY u.name
  ORDER BY count DESC, u.name ASC;
$$;
