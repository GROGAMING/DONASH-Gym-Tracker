import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

// ── shared types ──────────────────────────────────────────────────────────────

type SetLogRow = {
  id: string;
  player_session_log_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  created_at: string;
};

type SessionLogRow = {
  id: string;
  player_id: string;
  created_at: string;
};

type UserRow = {
  id: string;
  name: string;
};

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "summary";          // summary | player
  const playerId = url.searchParams.get("playerId") ?? "";

  // ── 1. Fetch players ──────────────────────────────────────────────────────
  const { data: users, error: uErr } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("team_id", TEAM_ID)
    .order("name");

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  const allUsers = (users ?? []) as UserRow[];
  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  // ── 2. Session counts per player (non-draft rows = completed sessions) ────
  //    is_draft = false is the reliable signal: /api/player-sessions/log always
  //    inserts without is_draft (defaults false). Drafts are inserted with
  //    is_draft = true and completed_at = null.
  const { data: completedSessions, error: csErr } = await supabaseAdmin
    .from("player_session_logs")
    .select("player_id")
    .eq("team_id", TEAM_ID)
    .eq("is_draft", false);

  if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 });

  const sessionCountByPlayer = new Map<string, number>();
  for (const row of (completedSessions ?? []) as { player_id: string }[]) {
    sessionCountByPlayer.set(row.player_id, (sessionCountByPlayer.get(row.player_id) ?? 0) + 1);
  }

  // Enrich users list with session counts
  const playersWithCounts = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    sessionCount: sessionCountByPlayer.get(u.id) ?? 0,
  }));

  // ── 3. Fetch all session logs for this team ──────────────────────────────
  const { data: sessionLogs, error: slErr } = await supabaseAdmin
    .from("player_session_logs")
    .select("id, player_id, created_at")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (slErr) return NextResponse.json({ error: slErr.message }, { status: 500 });

  const allSessionLogs = (sessionLogs ?? []) as SessionLogRow[];
  const sessionLogIds = allSessionLogs.map((s) => s.id);

  // ── 4. Fetch all set logs ────────────────────────────────────────────────
  //    Short-circuit if there are no session logs yet, but still return
  //    players with their counts (they may have completed sessions but no sets).
  if (sessionLogIds.length === 0) {
    return NextResponse.json(buildEmptyWithPlayers(playersWithCounts));
  }

  let setQuery = supabaseAdmin
    .from("player_set_logs")
    .select("id, player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
    .eq("team_id", TEAM_ID)
    .in("player_session_log_id", sessionLogIds)
    .order("created_at", { ascending: false });

  const { data: setLogs, error: setErr } = await setQuery;
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });
  const allSetLogs = (setLogs ?? []) as SetLogRow[];

  // ── session log → player map ─────────────────────────────────────────────
  const sessionToPlayer = new Map(allSessionLogs.map((s) => [s.id, s.player_id]));

  // ── SUMMARY tab ──────────────────────────────────────────────────────────
  if (tab === "summary") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Players who logged at least one set in last 7 days
    const recentPlayerIds = new Set<string>();
    for (const s of allSetLogs) {
      if (s.created_at >= sevenDaysAgo) {
        const pid = sessionToPlayer.get(s.player_session_log_id);
        if (pid) recentPlayerIds.add(pid);
      }
    }

    const totalPlayers = allUsers.length;
    const pctLogged = totalPlayers > 0 ? Math.round((recentPlayerIds.size / totalPlayers) * 100) : 0;
    const totalSets = allSetLogs.length;
    const totalVolume = allSetLogs.reduce((sum, s) => {
      if (s.weight != null && s.reps != null) return sum + s.weight * s.reps;
      return sum;
    }, 0);

    // Most logged exercise
    const exCounts = new Map<string, number>();
    for (const s of allSetLogs) {
      const key = s.exercise_name.trim().toLowerCase();
      exCounts.set(key, (exCounts.get(key) ?? 0) + 1);
    }
    let mostLoggedExercise = "";
    let mostLoggedCount = 0;
    for (const [name, count] of exCounts) {
      if (count > mostLoggedCount) { mostLoggedCount = count; mostLoggedExercise = name; }
    }
    // Capitalise
    if (mostLoggedExercise) {
      mostLoggedExercise = mostLoggedExercise.charAt(0).toUpperCase() + mostLoggedExercise.slice(1);
    }

    return NextResponse.json({
      tab: "summary",
      totalPlayers,
      pctLoggedLast7Days: pctLogged,
      playersLoggedLast7Days: recentPlayerIds.size,
      totalSets,
      totalVolume: Math.round(totalVolume),
      mostLoggedExercise: mostLoggedExercise || null,
      mostLoggedCount: mostLoggedExercise ? mostLoggedCount : 0,
      players: playersWithCounts,
    });
  }

  // ── BY-PLAYER tab ─────────────────────────────────────────────────────────
  if (tab === "player") {
    if (!playerId) {
      return NextResponse.json({
        tab: "player",
        players: playersWithCounts,
      });
    }

    // Sets belonging to this player
    const playerSessionIds = new Set(
      allSessionLogs.filter((s) => s.player_id === playerId).map((s) => s.id)
    );
    const playerSets = allSetLogs.filter((s) => playerSessionIds.has(s.player_session_log_id));

    // Group by exercise
    const byExercise = new Map<string, SetLogRow[]>();
    for (const s of playerSets) {
      const key = s.exercise_name.trim();
      byExercise.set(key, [...(byExercise.get(key) ?? []), s]);
    }

    const exercises = Array.from(byExercise.entries()).map(([name, sets]) => {
      const withWeight = sets.filter((s) => s.weight != null && s.reps != null);
      const bestSet = withWeight.reduce<SetLogRow | null>((best, s) => {
        if (!best) return s;
        return (s.weight! * s.reps!) > (best.weight! * best.reps!) ? s : best;
      }, null);

      const totalVolume = withWeight.reduce((sum, s) => sum + s.weight! * s.reps!, 0);

      // All sets ordered by created_at desc (most recent first)
      const allSets = sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
        created_at: s.created_at,
      }));

      return {
        name,
        totalSets: sets.length,
        totalVolume: Math.round(totalVolume),
        bestSet: bestSet
          ? { reps: bestSet.reps, weight: bestSet.weight, created_at: bestSet.created_at }
          : null,
        allSets,
      };
    });

    // Sort by most sets
    exercises.sort((a, b) => b.totalSets - a.totalSets);

    return NextResponse.json({
      tab: "player",
      players: playersWithCounts,
      playerName: userMap.get(playerId) ?? "Unknown",
      exercises,
    });
  }

  return NextResponse.json({ error: "Unknown tab" }, { status: 400 });
}

function buildEmptyWithPlayers(players: { id: string; name: string; sessionCount: number }[]) {
  return {
    tab: "summary",
    totalPlayers: players.length,
    pctLoggedLast7Days: 0,
    playersLoggedLast7Days: 0,
    totalSets: 0,
    totalVolume: 0,
    mostLoggedExercise: null,
    mostLoggedCount: 0,
    players,
  };
}
