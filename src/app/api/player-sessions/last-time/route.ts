import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeamIdForPlayer } from "@/lib/resolveTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asString(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const playerId = asString(url.searchParams.get("playerId"));
  // weeklySessionId of the session currently being viewed — excluded from results
  // so the player's own in-progress/current session never shows as "Last time"
  const currentWeeklySessionId = asString(url.searchParams.get("weeklySessionId"));

  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // ── Step 1: fetch all COMPLETED logs for this player (never drafts, never current session) ──
  // We query directly by player_id — NOT via weekly_sessions — so that:
  //   a) logs whose weekly_session_id was set to NULL (ON DELETE SET NULL) are still included
  //   b) exercises from any template/session in history are found, not just the current template
  //
  // Completed = is_draft IS false, OR is_draft IS NULL (legacy rows before column existed),
  //             AND completed_at IS NOT NULL for the null-draft case.
  // We also exclude the weekly_session currently open so a saved draft for today's session
  // doesn't appear as "last time".
  let logsQuery = supabaseAdmin
    .from("player_session_logs")
    .select("id, weekly_session_id, completed_at, created_at")
    .eq("player_id", playerId)
    .or("is_draft.eq.false,and(is_draft.is.null,completed_at.not.is.null)")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  // Exclude the session currently being viewed
  if (currentWeeklySessionId) {
    logsQuery = logsQuery.neq("weekly_session_id", currentWeeklySessionId);
  }

  const { data: logs, error: lErr } = await logsQuery;
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const logRows = (logs ?? []) as { id: string; weekly_session_id: string | null; completed_at: string | null; created_at: string }[];
  if (logRows.length === 0) return NextResponse.json({ last: {} }, { headers: { "Cache-Control": "no-store" } });

  // Build an ordered list of log IDs (newest first) and a map of logId → date for tie-breaking
  const logIds = logRows.map((l) => l.id);
  const logOrder: Record<string, number> = {};
  logRows.forEach((l, i) => { logOrder[l.id] = i; });

  // ── Step 2: fetch all sets for those logs ──
  const { data: sets, error: sErr } = await supabaseAdmin
    .from("player_set_logs")
    .select("player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
    .in("player_session_log_id", logIds)
    .order("set_number", { ascending: true });

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // ── Step 3: group sets by exercise, keeping only the most-recent log per exercise ──
  //
  // Key insight: the same exercise may appear in different logs with different exercise_id
  // values (or no exercise_id at all if logged before the column was populated). Using
  // exercise_id as the grouping key therefore splits what is actually one exercise into
  // multiple buckets, causing sets from different logs to both pass the "best log" filter.
  //
  // Solution: use normalised exercise_name as the single grouping key for resolving
  // "which log is the most recent for this exercise". Once we know the best log per name,
  // we emit the result under BOTH the exercise_id (for the primary UI lookup) AND the
  // normalised name (for the fallback lookup), but always from the SAME single log.
  //
  // A set is only valid if it has at least one real value (weight or reps not null).
  // Sets where both weight and reps are null are placeholder rows and are excluded.

  // Pass A: find the best (most recent) log id per normalised exercise name
  const bestLogIdxByName: Record<string, number> = {};  // normName → index in logOrder
  const bestLogIdByName: Record<string, string> = {};   // normName → log id

  for (const s of sets ?? []) {
    const exName = asString((s as any).exercise_name).toLowerCase();
    if (!exName) continue;

    const logId = asString((s as any).player_session_log_id);
    const idx = logOrder[logId] ?? Number.MAX_SAFE_INTEGER;

    if (!(exName in bestLogIdxByName) || idx < bestLogIdxByName[exName]) {
      bestLogIdxByName[exName] = idx;
      bestLogIdByName[exName] = logId;
    }
  }

  // Pass B: collect only the sets from the best log for each exercise,
  //         skipping sets where both weight and reps are null/missing.
  //         Emit under exercise_id key (primary) and normalised name key (fallback).
  const last: Record<string, any[]> = {};

  for (const s of sets ?? []) {
    const exId = asString((s as any).exercise_id);
    const exName = asString((s as any).exercise_name).toLowerCase();
    if (!exName) continue;

    const logId = asString((s as any).player_session_log_id);
    if (logId !== bestLogIdByName[exName]) continue;  // not the most-recent log for this exercise

    // Skip placeholder sets — must have at least weight OR reps
    const weight = (s as any).weight;
    const reps = (s as any).reps;
    if (weight == null && reps == null) continue;

    const entry = {
      reps,
      weight,
      set_number: (s as any).set_number,
      created_at: (s as any).created_at,
      exercise_name: (s as any).exercise_name,
    };

    // Primary lookup key: exercise_id (matches ex.id in UI)
    if (exId) {
      if (!last[exId]) last[exId] = [];
      last[exId].push(entry);
    }

    // Fallback lookup key: normalised name (used when ex.id differs or is absent)
    if (!last[exName]) last[exName] = [];
    last[exName].push(entry);
  }

  // Remove name-keyed entries that are already covered by an id-keyed entry
  // (they are identical data — keeping both is harmless but wastes bytes).
  // We leave them in so the UI fallback still works without any extra logic.

  return NextResponse.json({ last }, { headers: { "Cache-Control": "no-store" } });
}
