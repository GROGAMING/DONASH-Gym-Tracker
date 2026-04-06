-- ============================================================
-- Leaderboard RPC functions — canonical version
-- Safe to re-run (idempotent DROP + CREATE OR REPLACE).
--
-- SOURCE OF TRUTH: uploads table.
-- Every other part of the app (weekly-quota route, weeklyQuota.ts,
-- weeklyQuotaServer.ts) counts rows in public.uploads where status='active'.
-- The leaderboard must do the same so all features are consistent.
--
-- KEY DESIGN DECISIONS:
-- 1. p_week_start is TEXT (not date) — Supabase-js serialises JS strings
--    as JSON text; using date causes Postgres overload ambiguity errors.
-- 2. Weekly filter: uploads.created_at >= p_week_start (Mon 00:00 UTC)
--    AND < p_week_start::date + 7 days (next Mon 00:00 UTC).
--    This is the Monday-inclusive, Sunday-inclusive (next-Mon-exclusive) window.
-- 3. p_team_id is accepted as optional (DEFAULT NULL) to satisfy callers
--    that pass it (LeaderboardScreen, admin API) without breaking those
--    that don't (report page). Single-team deployment so it is not
--    used as a filter — all users are on the same team.
-- ============================================================

-- Drop ALL possible overload combinations to eliminate ambiguity
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(text, text);
DROP FUNCTION IF EXISTS public.get_leaderboard_week(date, text);
DROP FUNCTION IF EXISTS public.get_leaderboard_overall();
DROP FUNCTION IF EXISTS public.get_leaderboard_overall(text);

-- ── Weekly leaderboard ───────────────────────────────────────────────────────
-- Returns one row per user with the count of active uploads in the
-- Monday–Sunday week identified by p_week_start (e.g. '2026-03-30').
-- SECURITY DEFINER: runs as function owner (postgres), bypasses RLS on
-- uploads and users so the anon client gets the same data as service role.
CREATE OR REPLACE FUNCTION public.get_leaderboard_week(
  p_week_start text,
  p_team_id    text DEFAULT NULL
)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.name,
    COUNT(up.id) AS count
  FROM public.users u
  LEFT JOIN public.uploads up
    ON  up.user_id    = u.id
    AND up.status     = 'active'
    AND up.created_at >= p_week_start::timestamptz
    AND up.created_at <  (p_week_start::date + interval '7 days')::timestamptz
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;

-- ── Overall leaderboard ──────────────────────────────────────────────────────
-- Returns one row per user with their all-time active upload count.
-- SECURITY DEFINER: same reason as above.
CREATE OR REPLACE FUNCTION public.get_leaderboard_overall(
  p_team_id text DEFAULT NULL
)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.name,
    COUNT(up.id) AS count
  FROM public.users u
  LEFT JOIN public.uploads up
    ON  up.user_id = u.id
    AND up.status  = 'active'
  GROUP BY u.name
  ORDER BY count DESC, u.name;
$$;
