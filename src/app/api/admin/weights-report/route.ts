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
  const tab = url.searchParams.get("tab") ?? "summary";          // summary | player | exercise
  const playerId = url.searchParams.get("playerId") ?? "";
  const exerciseName = url.searchParams.get("exerciseName") ?? "";

  // ── 1. Fetch all session logs for this team ──────────────────────────────
  const { data: sessionLogs, error: slErr } = await supabaseAdmin
    .from("player_session_logs")
    .select("id, player_id, created_at")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (slErr) return NextResponse.json({ error: slErr.message }, { status: 500 });

  const allSessionLogs = (sessionLogs ?? []) as SessionLogRow[];
  const sessionLogIds = allSessionLogs.map((s) => s.id);

  // ── 2. Fetch all set logs ────────────────────────────────────────────────
  let setQuery = supabaseAdmin
    .from("player_set_logs")
    .select("id, player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (sessionLogIds.length > 0) {
    setQuery = setQuery.in("player_session_log_id", sessionLogIds);
  } else {
    return NextResponse.json(buildEmpty());
  }

  const { data: setLogs, error: setErr } = await setQuery;
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });
  const allSetLogs = (setLogs ?? []) as SetLogRow[];

  // ── 3. Fetch players ─────────────────────────────────────────────────────
  const { data: users, error: uErr } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("team_id", TEAM_ID)
    .order("name");

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  const allUsers = (users ?? []) as UserRow[];
  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  // ── session log → player map ─────────────────────────────────────────────
  const sessionToPlayer = new Map(allSessionLogs.map((s) => [s.id, s.player_id]));
  const sessionToCreatedAt = new Map(allSessionLogs.map((s) => [s.id, s.created_at]));

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
      players: allUsers,
      exerciseNames: Array.from(
        new Set(allSetLogs.map((s) => s.exercise_name.trim()).filter(Boolean))
      ).sort(),
    });
  }

  // ── BY-PLAYER tab ─────────────────────────────────────────────────────────
  if (tab === "player") {
    if (!playerId) {
      return NextResponse.json({
        tab: "player",
        players: allUsers,
        exerciseNames: [],
        exercises: [],
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

      // Last 10 sets (already ordered by created_at desc)
      const last10 = sets.slice(0, 10).map((s) => ({
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
        last10,
      };
    });

    // Sort by most sets
    exercises.sort((a, b) => b.totalSets - a.totalSets);

    return NextResponse.json({
      tab: "player",
      players: allUsers,
      playerName: userMap.get(playerId) ?? "Unknown",
      exercises,
    });
  }

  // ── BY-EXERCISE tab ───────────────────────────────────────────────────────
  if (tab === "exercise") {
    const exerciseNames = Array.from(
      new Set(allSetLogs.map((s) => s.exercise_name.trim()).filter(Boolean))
    ).sort();

    if (!exerciseName) {
      return NextResponse.json({ tab: "exercise", exerciseNames, players: [] });
    }

    const exSets = allSetLogs.filter(
      (s) => s.exercise_name.trim().toLowerCase() === exerciseName.trim().toLowerCase()
    );

    // Group by player
    const byPlayer = new Map<string, SetLogRow[]>();
    for (const s of exSets) {
      const pid = sessionToPlayer.get(s.player_session_log_id) ?? "";
      byPlayer.set(pid, [...(byPlayer.get(pid) ?? []), s]);
    }

    const playerStats = Array.from(byPlayer.entries()).map(([pid, sets]) => {
      const name = userMap.get(pid) ?? "Unknown";
      const withWeight = sets.filter((s) => s.weight != null && s.reps != null);

      // Best set = highest 1RM proxy (weight × reps)
      const bestSet = withWeight.reduce<SetLogRow | null>((best, s) => {
        if (!best) return s;
        return s.weight! * s.reps! > best.weight! * best.reps! ? s : best;
      }, null);

      // Last set = most recent
      const lastSet = sets[0] ?? null;

      // Previous set = second most recent
      const prevSet = sets[1] ?? null;

      return {
        playerId: pid,
        playerName: name,
        totalSets: sets.length,
        bestSet: bestSet
          ? { reps: bestSet.reps, weight: bestSet.weight, created_at: bestSet.created_at }
          : null,
        lastSet: lastSet
          ? { reps: lastSet.reps, weight: lastSet.weight, created_at: lastSet.created_at }
          : null,
        prevSet: prevSet
          ? { reps: prevSet.reps, weight: prevSet.weight, created_at: prevSet.created_at }
          : null,
      };
    });

    playerStats.sort((a, b) => b.totalSets - a.totalSets);

    return NextResponse.json({
      tab: "exercise",
      exerciseNames,
      exerciseName,
      players: playerStats,
    });
  }

  return NextResponse.json({ error: "Unknown tab" }, { status: 400 });
}

function buildEmpty() {
  return {
    tab: "summary",
    totalPlayers: 0,
    pctLoggedLast7Days: 0,
    playersLoggedLast7Days: 0,
    totalSets: 0,
    totalVolume: 0,
    mostLoggedExercise: null,
    mostLoggedCount: 0,
    players: [],
    exerciseNames: [],
  };
}
