import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ── Diagnostic counts (all run in parallel, never block the response) ──
  const [totalRes, withTeamRes, notDraftRes, withCompletedRes] = await Promise.all([
    // 1. Total rows for this player regardless of any filter
    supabaseAdmin
      .from("player_session_logs")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId),
    // 2. Rows where team_id matches currentTeamId
    supabaseAdmin
      .from("player_session_logs")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("team_id", currentTeamId),
    // 3. Rows where is_draft = false
    supabaseAdmin
      .from("player_session_logs")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("is_draft", false),
    // 4. Rows where completed_at IS NOT NULL
    supabaseAdmin
      .from("player_session_logs")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .not("completed_at", "is", null),
  ]);

  const diag = {
    total: totalRes.count ?? 0,
    withTeamId: withTeamRes.count ?? 0,
    isDraftFalse: notDraftRes.count ?? 0,
    completedAtNotNull: withCompletedRes.count ?? 0,
  };

  // ── Safe one-time backfill for legacy rows (admin client, no RLS) ──
  // Pattern: rows for this player where is_draft IS NULL → set is_draft = false
  // (happens when is_draft column was added AFTER rows were inserted, so DEFAULT
  //  never ran for existing rows and the column landed as NULL in practice)
  // Also patch team_id = currentTeamId where it is null.
  // These UPDATEs are idempotent and only affect rows needing repair.
  await Promise.all([
    supabaseAdmin
      .from("player_session_logs")
      .update({ is_draft: false })
      .eq("player_id", playerId)
      .is("is_draft", null)
      .not("completed_at", "is", null),
    supabaseAdmin
      .from("player_session_logs")
      .update({ team_id: currentTeamId })
      .eq("player_id", playerId)
      .is("team_id", null),
  ]);

  // ── PERMANENT HISTORY QUERY ──────────────────────────────────────────────
  // DO NOT add date filters, week filters, or .limit() here.
  // This must return ALL completed logs for this player, all time.
  //
  // Rows are "completed" if ANY of:
  //   is_draft = false   (normal completed row)
  //   is_draft IS NULL   (legacy row inserted before is_draft column existed)
  //   completed_at IS NOT NULL  (belt-and-suspenders)
  //
  // snapshot_week_start / snapshot_template_title are written at log time
  // and survive weekly_sessions deletion (FK is ON DELETE SET NULL now).
  // ──────────────────────────────────────────────────────────────────────────
  const { data: logs, error: lErr } = await supabaseAdmin
    .from("player_session_logs")
    .select("id, created_at, completed_at, weekly_session_id, is_draft, team_id, snapshot_week_start, snapshot_template_title")
    .eq("player_id", playerId)
    .or("is_draft.eq.false,is_draft.is.null,completed_at.not.is.null")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (lErr) {
    return NextResponse.json({ error: lErr.message, diag }, { status: 500 });
  }

  const logRows = (logs ?? []) as {
    id: string;
    created_at: string;
    completed_at: string | null;
    weekly_session_id: string | null;
    team_id: string | null;
    snapshot_week_start: string | null;
    snapshot_template_title: string | null;
  }[];

  if (logRows.length === 0) {
    return NextResponse.json({ logs: [], diag });
  }

  const logIds = logRows.map((l) => l.id);
  // Only resolve weekly_sessions for rows that still have a FK reference
  // (rows whose weekly_sessions was deleted will have weekly_session_id = NULL;
  //  those rows still appear in history via their snapshot columns).
  const weeklyIds = Array.from(new Set(logRows.map((l) => l.weekly_session_id).filter(Boolean))) as string[];

  // Fetch weekly session info (best-effort — no team_id filter so legacy rows resolve)
  let weeklyById: Record<string, any> = {};
  if (weeklyIds.length > 0) {
    const { data: weeklyRows } = await supabaseAdmin
      .from("weekly_sessions")
      .select("id, week_start, template_id, session_templates(id, title)")
      .in("id", weeklyIds);

    weeklyById = (weeklyRows ?? []).reduce<Record<string, any>>((acc, r) => {
      acc[(r as any).id] = r;
      return acc;
    }, {});
  }

  // Fetch sets (best-effort — no team_id filter)
  let setsByLog: Record<string, any[]> = {};
  if (logIds.length > 0) {
    const { data: sets } = await supabaseAdmin
      .from("player_set_logs")
      .select("id, player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
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
    diag,
    logs: logRows.map((l) => {
      const w = l.weekly_session_id ? (weeklyById[l.weekly_session_id] as any | undefined) : undefined;

      // Use snapshot columns first (written at log time, immune to deletions).
      // Fall back to live weekly_sessions join for rows logged before snapshots were added.
      const weekStart = l.snapshot_week_start ?? w?.week_start ?? null;
      const templateTitle = l.snapshot_template_title ?? w?.session_templates?.title ?? null;

      return {
        id: l.id,
        created_at: l.created_at,
        completed_at: l.completed_at,
        weekly_session: (w || weekStart)
          ? {
              id: w?.id ?? null,
              week_start: weekStart,
              template_id: w?.template_id ?? null,
              template_title: templateTitle,
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
