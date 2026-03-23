import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeamIdForPlayer } from "@/lib/resolveTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  return Math.floor(x);
}
function asOptionalNumber(x: unknown): number | null {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  return x;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    weeklySessionId?: unknown;
    playerId?: unknown;
    sets?: unknown;
  } | null;

  const weeklySessionId = asString(body?.weeklySessionId);
  const playerId = asString(body?.playerId);

  if (!weeklySessionId) return NextResponse.json({ error: "Missing weeklySessionId" }, { status: 400 });
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data: weekly, error: wErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id")
    .eq("team_id", currentTeamId)
    .eq("id", weeklySessionId)
    .single();

  if (wErr || !weekly) return NextResponse.json({ error: "Weekly session not found" }, { status: 404 });

  let draftId: string;

  const { data: existing } = await supabaseAdmin
    .from("player_session_logs")
    .select("id")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .eq("weekly_session_id", weeklySessionId)
    .eq("is_draft", true)
    .maybeSingle();

  if (existing) {
    draftId = (existing as { id: string }).id;
  } else {
    const { data: created, error: cErr } = await supabaseAdmin
      .from("player_session_logs")
      .insert({
        team_id: currentTeamId,
        weekly_session_id: weeklySessionId,
        player_id: playerId,
        is_draft: true,
        completed_at: null,
      })
      .select("id")
      .single();

    if (cErr || !created) return NextResponse.json({ error: cErr?.message || "Failed to create draft" }, { status: 500 });
    draftId = (created as { id: string }).id;
  }

  await supabaseAdmin.from("player_set_logs").delete().eq("player_session_log_id", draftId);

  const rawSets = Array.isArray(body?.sets) ? (body?.sets as unknown[]) : [];
  const setRows = rawSets
    .map((x) => x as SetPayload)
    .map((s) => ({
      team_id: currentTeamId,
      player_session_log_id: draftId,
      exercise_id: asString(s.exerciseId) || null,
      exercise_name: asString(s.exerciseName),
      set_number: asOptionalInt(s.setNumber) ?? 0,
      reps: asOptionalInt(s.reps),
      weight: asOptionalNumber(s.weight),
    }))
    .filter((r) => r.exercise_name.length > 0 && r.set_number > 0);

  if (setRows.length > 0) {
    const { error: sErr } = await supabaseAdmin.from("player_set_logs").insert(setRows);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draftId }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weeklySessionId = asString(url.searchParams.get("weeklySessionId"));
  const playerId = asString(url.searchParams.get("playerId"));

  if (!weeklySessionId || !playerId) return NextResponse.json({ draft: null });

  const currentTeamId = await getTeamIdForPlayer(playerId);
  if (!currentTeamId) return NextResponse.json({ draft: null });

  const { data: draft } = await supabaseAdmin
    .from("player_session_logs")
    .select("id")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .eq("weekly_session_id", weeklySessionId)
    .eq("is_draft", true)
    .maybeSingle();

  if (!draft) return NextResponse.json({ draft: null }, { headers: { "Cache-Control": "no-store" } });

  const draftId = (draft as { id: string }).id;

  const { data: sets } = await supabaseAdmin
    .from("player_set_logs")
    .select("exercise_id, exercise_name, set_number, reps, weight")
    .eq("player_session_log_id", draftId)
    .order("set_number", { ascending: true });

  return NextResponse.json({ draft: { id: draftId, sets: sets ?? [] } }, { headers: { "Cache-Control": "no-store" } });
}
