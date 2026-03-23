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
  // Matching priority:
  //   1. exercise_id (UUID) — exact match, most reliable
  //   2. exercise_name (text, trimmed, case-insensitive) — fallback for rows where
  //      exercise_id is null (logged before the column existed, or exercise was re-created)
  //
  // For each exercise key we track which log (by position in logOrder) is the newest,
  // then emit only the sets from that single log.

  // keyed by exercise_id when present, else by normalised name
  const bestLogIdx: Record<string, number> = {};    // key → index in logOrder (lower = newer)
  const bestLogId: Record<string, string> = {};     // key → log id

  for (const s of sets ?? []) {
    const exId = asString((s as any).exercise_id);
    const exName = asString((s as any).exercise_name).toLowerCase();
    const key = exId || exName;
    if (!key) continue;

    const logId = asString((s as any).player_session_log_id);
    const idx = logOrder[logId] ?? Number.MAX_SAFE_INTEGER;

    if (!(key in bestLogIdx) || idx < bestLogIdx[key]) {
      bestLogIdx[key] = idx;
      bestLogId[key] = logId;
    }
  }

  // Now collect the sets for each exercise's best (most recent) log
  const resultById: Record<string, any[]> = {};     // keyed by exercise_id (for UI lookup)
  const resultByName: Record<string, any[]> = {};   // keyed by normalised name (fallback)

  for (const s of sets ?? []) {
    const exId = asString((s as any).exercise_id);
    const exName = asString((s as any).exercise_name).toLowerCase();
    const key = exId || exName;
    if (!key) continue;

    const logId = asString((s as any).player_session_log_id);
    if (logId !== bestLogId[key]) continue;   // not from the most-recent log for this exercise

    const entry = {
      reps: (s as any).reps,
      weight: (s as any).weight,
      set_number: (s as any).set_number,
      created_at: (s as any).created_at,
      exercise_name: (s as any).exercise_name,
    };

    // Store under exercise_id (primary lookup in UI: lastTime?.last?.[ex.id])
    if (exId) {
      if (!resultById[exId]) resultById[exId] = [];
      resultById[exId].push(entry);
    }

    // Also store under normalised name so the UI can fall back if ex.id differs
    if (exName) {
      if (!resultByName[exName]) resultByName[exName] = [];
      resultByName[exName].push(entry);
    }
  }

  // Merge: start with id-keyed results, add name-keyed under the same key
  // so the UI receives both lookup paths in one flat map.
  const last: Record<string, any[]> = { ...resultById };
  for (const [name, entries] of Object.entries(resultByName)) {
    if (!last[name]) last[name] = entries;   // only add if no id-keyed entry already present
  }

  return NextResponse.json({ last }, { headers: { "Cache-Control": "no-store" } });
}
