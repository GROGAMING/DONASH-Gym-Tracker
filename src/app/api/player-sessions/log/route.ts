import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeamIdForPlayer } from "@/lib/resolveTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
  weeklySessionId?: unknown;
  playerId?: unknown;
  completed?: unknown;
  sets?: unknown;
};

type SetPayload = {
  exerciseId?: unknown;
  exerciseName?: unknown;
  setNumber?: unknown;
  reps?: unknown;
  weight?: unknown;
};

function asString(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function asOptionalInt(x: unknown): number | null {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  const v = Math.floor(x);
  if (!Number.isFinite(v)) return null;
  return v;
}

function asOptionalNumber(x: unknown): number | null {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  return x;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RequestBody | null;

  const weeklySessionId = asString(body?.weeklySessionId);
  const playerId = asString(body?.playerId);
  const completed = body?.completed === true;

  if (!weeklySessionId) return NextResponse.json({ error: "Missing weeklySessionId" }, { status: 400 });
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) {
    console.error("[log] Player not found in any team — playerId:", playerId);
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  console.log("[log] Request — playerId:", playerId, "weeklySessionId:", weeklySessionId, "teamId:", currentTeamId);

  // Fetch weekly session + template title for snapshot (permanent history record).
  // Snapshot columns are written at log time so history survives if weekly_sessions
  // rows are later deleted (FK is now ON DELETE SET NULL, not CASCADE).
  // Using supabaseAdmin (service-role key) so RLS never blocks server-side operations.
  const { data: weekly, error: wErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id, week_start, session_templates(id, title)")
    .eq("team_id", currentTeamId)
    .eq("id", weeklySessionId)
    .single();

  if (wErr || !weekly) {
    console.error("[log] Weekly session not found — weeklySessionId:", weeklySessionId, "teamId:", currentTeamId, "error:", wErr?.message);
    return NextResponse.json({ error: "Weekly session not found" }, { status: 404 });
  }

  const snapshotWeekStart = (weekly as any).week_start as string | null ?? null;
  const snapshotTemplateTitle = ((weekly as any).session_templates as { title?: string } | null)?.title ?? null;

  // Note: player existence is already confirmed by getTeamIdForPlayer (uses admin client).
  // Re-querying via anon key here would be subject to RLS and could return
  // "JSON object requested, multiple (or no) rows returned" for users without
  // matching auth.uid() — that was the root cause of user-specific failures.

  // Check for an existing row (draft or completed) for this player + weekly session.
  const { data: existing, error: existErr } = await supabaseAdmin
    .from("player_session_logs")
    .select("id, is_draft")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .eq("weekly_session_id", weeklySessionId)
    .maybeSingle();

  if (existErr) {
    console.error("[log] Error checking existing log — playerId:", playerId, "weeklySessionId:", weeklySessionId, "error:", existErr.message);
    return NextResponse.json({ error: existErr.message }, { status: 500 });
  }

  const existingRow = existing as { id: string; is_draft: boolean } | null;

  // If a completed row already exists, return idempotent 409.
  if (existingRow && existingRow.is_draft === false) {
    return NextResponse.json(
      { error: "You have already logged this session.", sessionLogId: existingRow.id, alreadyLogged: true },
      { status: 409 },
    );
  }

  let sessionLogId: string;

  const completedAt = new Date().toISOString();

  if (existingRow && existingRow.is_draft === true) {
    // Draft exists: promote it to a completed log.
    // Write snapshot columns so history is preserved even if weekly_sessions row is later removed.
    console.log("[log] Promoting draft to completed — draftId:", existingRow.id, "playerId:", playerId, "weeklySessionId:", weeklySessionId, "snapshotWeekStart:", snapshotWeekStart, "snapshotTemplateTitle:", snapshotTemplateTitle);
    const { error: upErr } = await supabaseAdmin
      .from("player_session_logs")
      .update({
        is_draft: false,
        completed_at: completedAt,
        snapshot_week_start: snapshotWeekStart,
        snapshot_template_title: snapshotTemplateTitle,
      })
      .eq("id", existingRow.id);

    if (upErr) {
      console.error("[log] Failed to promote draft — draftId:", existingRow.id, "error:", upErr.message);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // Replace the draft's sets with the final submitted sets.
    await supabaseAdmin.from("player_set_logs").delete().eq("player_session_log_id", existingRow.id);

    sessionLogId = existingRow.id;
  } else {
    // No existing row — insert fresh with snapshot columns.
    const insertPayload = {
      team_id: currentTeamId,
      weekly_session_id: weeklySessionId,
      player_id: playerId,
      is_draft: false,
      completed_at: completedAt,
      snapshot_week_start: snapshotWeekStart,
      snapshot_template_title: snapshotTemplateTitle,
    };
    console.log("[log] Inserting new session log — payload:", JSON.stringify(insertPayload));
    const { data: sessionLog, error: lErr } = await supabaseAdmin
      .from("player_session_logs")
      .insert(insertPayload)
      .select("id")
      .single();

    if (lErr || !sessionLog) {
      console.error("[log] Insert failed — payload:", JSON.stringify(insertPayload), "error:", lErr?.message);
      return NextResponse.json({ error: lErr?.message || "Failed to create log" }, { status: 500 });
    }
    sessionLogId = (sessionLog as { id: string }).id;
  }

  const rawSets = Array.isArray(body?.sets) ? (body?.sets as unknown[]) : [];
  const setRows = rawSets
    .map((x) => x as SetPayload)
    .map((s) => {
      const exerciseId = asString(s.exerciseId);
      const exerciseName = asString(s.exerciseName);
      const setNumber = asOptionalInt(s.setNumber);
      const reps = asOptionalInt(s.reps);
      const weight = asOptionalNumber(s.weight);

      return {
        team_id: currentTeamId,
        player_session_log_id: sessionLogId,
        exercise_id: exerciseId || null,
        exercise_name: exerciseName,
        set_number: typeof setNumber === "number" ? setNumber : 0,
        reps,
        weight,
      };
    })
    .filter((r) => r.exercise_name.length > 0 && r.set_number > 0);

  if (setRows.length > 0) {
    console.log("[log] Inserting", setRows.length, "set rows for sessionLogId:", sessionLogId);
    const { error: sErr } = await supabaseAdmin.from("player_set_logs").insert(setRows);
    if (sErr) {
      console.error("[log] Set insert failed — sessionLogId:", sessionLogId, "error:", sErr.message);
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, sessionLogId }, { headers: { "Cache-Control": "no-store" } });
}
