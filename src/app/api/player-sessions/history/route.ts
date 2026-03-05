import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asString(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const playerId = asString(url.searchParams.get("playerId"));
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: logs, error: lErr } = await supabase
    .from("player_session_logs")
    .select("id, created_at, completed_at, weekly_session_id")
    .eq("team_id", TEAM_ID)
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const logRows = (logs ?? []) as { id: string; created_at: string; completed_at: string | null; weekly_session_id: string }[];
  const logIds = logRows.map((l) => l.id);
  const weeklyIds = Array.from(new Set(logRows.map((l) => l.weekly_session_id)));

  const { data: weeklyRows, error: wErr } = await supabase
    .from("weekly_sessions")
    .select("id, week_start, template_id, session_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .in("id", weeklyIds);

  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  const weeklyById = (weeklyRows ?? []).reduce<Record<string, any>>((acc, r) => {
    acc[(r as any).id] = r;
    return acc;
  }, {});

  const { data: sets, error: sErr } = await supabase
    .from("player_set_logs")
    .select("id, player_session_log_id, exercise_id, exercise_name, set_number, reps, weight, created_at")
    .eq("team_id", TEAM_ID)
    .in("player_session_log_id", logIds)
    .order("created_at", { ascending: false });

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const setsByLog = (sets ?? []).reduce<Record<string, any[]>>((acc, r) => {
    const logId = (r as any).player_session_log_id as string;
    acc[logId] = acc[logId] ?? [];
    acc[logId].push(r);
    return acc;
  }, {});

  return NextResponse.json({
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
