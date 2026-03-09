import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getTeamIdForPlayer } from "@/lib/resolveTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asString(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const playerId = asString(url.searchParams.get("playerId"));
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ── Diagnostic: count ALL rows for this player regardless of any filter ──
  // This helps diagnose filter mismatches without breaking the response.
  const { count: totalCount } = await supabase
    .from("player_session_logs")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId);

  // ── Fetch completed logs: is_draft = false OR completed_at IS NOT NULL ──
  // Using or() makes this resilient to legacy rows where is_draft was never
  // set to false (e.g. old rows that only have completed_at).
  const { data: logs, error: lErr } = await supabase
    .from("player_session_logs")
    .select("id, created_at, completed_at, weekly_session_id, is_draft")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .or("is_draft.eq.false,completed_at.not.is.null")
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (lErr) {
    return NextResponse.json({ error: lErr.message, diagnosticTotalCount: totalCount }, { status: 500 });
  }

  const logRows = (logs ?? []) as { id: string; created_at: string; completed_at: string | null; weekly_session_id: string }[];

  // Return diagnostic info even when empty so we can see totalCount in network tab
  if (logRows.length === 0) {
    return NextResponse.json({ logs: [], diagnosticTotalCount: totalCount });
  }

  const logIds = logRows.map((l) => l.id);
  const weeklyIds = Array.from(new Set(logRows.map((l) => l.weekly_session_id).filter(Boolean)));

  // Fetch weekly session info (best-effort — don't fail if missing)
  let weeklyById: Record<string, any> = {};
  if (weeklyIds.length > 0) {
    const { data: weeklyRows } = await supabase
      .from("weekly_sessions")
      .select("id, week_start, template_id, session_templates(id, title)")
      .eq("team_id", currentTeamId)
      .in("id", weeklyIds);

    weeklyById = (weeklyRows ?? []).reduce<Record<string, any>>((acc, r) => {
      acc[(r as any).id] = r;
      return acc;
    }, {});
  }

  // Fetch sets (best-effort)
  let setsByLog: Record<string, any[]> = {};
  if (logIds.length > 0) {
    const { data: sets } = await supabase
      .from("player_set_logs")
      .select("id, player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
      .eq("team_id", currentTeamId)
      .in("player_session_log_id", logIds)
      .order("set_number", { ascending: true });

    setsByLog = (sets ?? []).reduce<Record<string, any[]>>((acc, r) => {
      const logId = (r as any).player_session_log_id as string;
      acc[logId] = acc[logId] ?? [];
      acc[logId].push(r);
      return acc;
    }, {});
  }

  return NextResponse.json({
    diagnosticTotalCount: totalCount,
    logs: logRows.map((l) => {
      const w = weeklyById[l.weekly_session_id] as any | undefined;
      return {
        id: l.id,
        created_at: l.created_at,
        completed_at: l.completed_at,
        weekly_session: w
          ? {
              id: w.id,
              week_start: w.week_start,
              template_id: w.template_id,
              template_title: w.session_templates?.title ?? null,
            }
          : null,
        sets: (setsByLog[l.id] ?? []).map((s) => ({
          id: (s as any).id,
          exercise_id: (s as any).exercise_id,
          exercise_name: (s as any).exercise_name,
          set_number: (s as any).set_number,
          reps: (s as any).reps,
          weight: (s as any).weight,
          created_at: (s as any).created_at,
        })),
      };
    }),
  });
}
