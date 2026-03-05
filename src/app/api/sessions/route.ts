import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO } from "@/lib/week";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssignedSessionRow = {
  id: string;
  week_start: string;
  template_id: string;
  workout_templates?: { id?: string; title?: string } | null;
};

type ExerciseRow = {
  id: string;
  name: string;
  sort_order: number;
};

export async function GET() {
  const weekStart = mondayWeekStartISO(new Date());

  const { data: assigned, error: aErr } = await supabaseAdmin
    .from("assigned_sessions")
    .select("id, week_start, template_id, workout_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (aErr) {
    return NextResponse.json({ error: aErr.message, weekStart }, { status: 500 });
  }

  if (!assigned) {
    return NextResponse.json({ weekStart, session: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const a = assigned as AssignedSessionRow;

  const templateTitle = a.workout_templates?.title ?? null;

  const { data: exercises, error: eErr } = await supabaseAdmin
    .from("workout_exercises")
    .select("id, name, sort_order")
    .eq("team_id", TEAM_ID)
    .eq("template_id", a.template_id)
    .order("sort_order", { ascending: true });

  if (eErr) {
    return NextResponse.json({ error: eErr.message, weekStart }, { status: 500 });
  }

  return NextResponse.json(
    {
      weekStart,
      session: {
        id: a.id,
        week_start: a.week_start,
        template_id: a.template_id,
        template_title: templateTitle,
        exercises: (exercises ?? []) as ExerciseRow[],
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
