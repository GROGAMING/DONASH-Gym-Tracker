-- ============================================================
-- Restore leaderboard RPC functions to use uploads table
-- ============================================================
-- Source of truth: public.uploads (photo uploads)
-- Columns used:  uploads.user_id  (fk -> users.id)
--                uploads.team_id  (scopes to deployment team)
--                uploads.status   'active' = visible upload
--                uploads.created_at timestamptz
--
-- Frontend calls:
--   get_leaderboard_week({ p_week_start: 'YYYY-MM-DD', p_team_id: '<uuid>' })
--   get_leaderboard_overall({ p_team_id: '<uuid>' })
--
-- Both parameters arrive as text from the JS client.
-- uploads.team_id and users.id are uuid in the live DB so we
-- cast the text params to uuid for the join/filter.
-- ============================================================

-- Drop every known overload so no stale signature blocks CREATE.
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text, text);

-- ── Weekly leaderboard ───────────────────────────────────────
-- Counts active photo uploads for one team within one ISO week.
-- Week window: [p_week_start 00:00 UTC, p_week_start + 7 days).
CREATE FUNCTION public.get_leaderboard_week(p_week_start text, p_team_id text)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.name,
    COUNT(up.id) AS count
  FROM public.users u
  LEFT JOIN public.uploads up
    ON  up.user_id  = u.id
    AND up.team_id  = p_team_id::uuid
    AND up.status   = 'active'
    AND up.created_at >= (p_week_start::date)::timestamptz
    AND up.created_at <  (p_week_start::date + interval '7 days')::timestamptz
  WHERE u.team_id = p_team_id::uuid
  GROUP BY u.name
  ORDER BY count DESC, u.name ASC;
$$;

-- Drop every known overload of get_leaderboard_overall.
DROP FUNCTION IF EXISTS public.get_leaderboard_overall() CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard_overall(text);

-- ── All-time leaderboard ─────────────────────────────────────
-- Counts all active photo uploads for one team, no date filter.
CREATE FUNCTION public.get_leaderboard_overall(p_team_id text)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.name,
    COUNT(up.id) AS count
  FROM public.users u
  LEFT JOIN public.uploads up
    ON  up.user_id = u.id
    AND up.team_id = p_team_id::uuid
    AND up.status  = 'active'
  WHERE u.team_id = p_team_id::uuid
  GROUP BY u.name
  ORDER BY count DESC, u.name ASC;
$$;
