import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (!currentTeamId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: weekly, error: wErr } = await supabase
    .from("weekly_sessions")
    .select("id")
    .eq("team_id", currentTeamId)
    .eq("id", weeklySessionId)
    .single();

  if (wErr || !weekly) return NextResponse.json({ error: "Weekly session not found" }, { status: 404 });

  const { data: player, error: pErr } = await supabase
    .from("users")
    .select("id")
    .eq("team_id", currentTeamId)
    .eq("id", playerId)
    .single();

  if (pErr || !player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Check for an existing row (draft or completed) for this player + weekly session.
  const { data: existing, error: existErr } = await supabase
    .from("player_session_logs")
    .select("id, is_draft")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .eq("weekly_session_id", weeklySessionId)
    .maybeSingle();

  if (existErr) return NextResponse.json({ error: existErr.message }, { status: 500 });

  const existingRow = existing as { id: string; is_draft: boolean } | null;

  // If a completed row already exists, return idempotent 409.
  if (existingRow && existingRow.is_draft === false) {
    return NextResponse.json(
      { error: "You have already logged this session.", sessionLogId: existingRow.id, alreadyLogged: true },
      { status: 409 },
    );
  }

  let sessionLogId: string;

  if (existingRow && existingRow.is_draft === true) {
    // Draft exists: promote it to a completed log.
    const { error: upErr } = await supabase
      .from("player_session_logs")
      .update({
        is_draft: false,
        completed_at: completed ? new Date().toISOString() : new Date().toISOString(),
      })
      .eq("id", existingRow.id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Replace the draft's sets with the final submitted sets.
    await supabase.from("player_set_logs").delete().eq("player_session_log_id", existingRow.id);

    sessionLogId = existingRow.id;
  } else {
    // No existing row — insert fresh.
    const { data: sessionLog, error: lErr } = await supabase
      .from("player_session_logs")
      .insert({
        team_id: currentTeamId,
        weekly_session_id: weeklySessionId,
        player_id: playerId,
        is_draft: false,
        completed_at: completed ? new Date().toISOString() : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (lErr || !sessionLog) return NextResponse.json({ error: lErr?.message || "Failed to create log" }, { status: 500 });
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
    const { error: sErr } = await supabase.from("player_set_logs").insert(setRows);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sessionLogId }, { headers: { "Cache-Control": "no-store" } });
}
