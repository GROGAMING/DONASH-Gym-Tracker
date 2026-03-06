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
  const templateId = asString(url.searchParams.get("templateId"));

  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: "Missing templateId" }, { status: 400 });

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
    .eq("template_id", templateId);

  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  const weeklyIds = (weekly ?? []).map((r) => (r as any).id as string);
  if (weeklyIds.length === 0) return NextResponse.json({ last: {} });

  const { data: logs, error: lErr } = await supabase
    .from("player_session_logs")
    .select("id, weekly_session_id, created_at")
    .eq("team_id", currentTeamId)
    .eq("player_id", playerId)
    .in("weekly_session_id", weeklyIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const logIds = (logs ?? []).map((r) => (r as any).id as string);
  if (logIds.length === 0) return NextResponse.json({ last: {} });

  const { data: sets, error: sErr } = await supabase
    .from("player_set_logs")
    .select("exercise_id, exercise_name, set_number, reps, weight, created_at")
    .eq("team_id", currentTeamId)
    .in("player_session_log_id", logIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const lastByExerciseId: Record<string, any[]> = {};
  for (const s of sets ?? []) {
    const exId = (s as any).exercise_id as string | null;
    if (!exId) continue;
    if (!lastByExerciseId[exId]) lastByExerciseId[exId] = [];
    lastByExerciseId[exId].push({
      reps: (s as any).reps,
      weight: (s as any).weight,
      set_number: (s as any).set_number,
      created_at: (s as any).created_at,
      exercise_name: (s as any).exercise_name,
    });
  }

  return NextResponse.json({ last: lastByExerciseId }, { headers: { "Cache-Control": "no-store" } });
}
