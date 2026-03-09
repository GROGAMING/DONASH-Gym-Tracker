import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO } from "@/lib/week";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActiveAssignmentRow = {
  id: string;
  template_id: string;
};

type WeeklySessionRow = {
  id: string;
  week_start: string;
  template_id: string;
  session_templates?: { id?: string; title?: string } | null;
};

type ExerciseRow = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
};

export async function GET() {
  const weekStart = mondayWeekStartISO(new Date());

  // 1. Read which templates are currently active for this team.
  const { data: activeRows, error: actErr } = await supabaseAdmin
    .from("active_template_assignments")
    .select("id, template_id")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: true });

  if (actErr) return NextResponse.json({ error: actErr.message }, { status: 500 });

  const activeAssignments = (activeRows ?? []) as ActiveAssignmentRow[];

  if (activeAssignments.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // 2. For each active template, upsert a weekly_sessions instance for the current week.
  //    The unique index on (team_id, template_id, week_start) ensures idempotency.
  const upsertRows = activeAssignments.map((a) => ({
    team_id: TEAM_ID,
    template_id: a.template_id,
    week_start: weekStart,
  }));

  const { data: upserted, error: uErr } = await supabaseAdmin
    .from("weekly_sessions")
    .upsert(upsertRows, { onConflict: "team_id,template_id,week_start", ignoreDuplicates: true })
    .select("id, week_start, template_id, session_templates(id, title)");

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  // 3. If upsert returned nothing (rows already existed), fetch them explicitly.
  let instanceRows = (upserted ?? []) as WeeklySessionRow[];
  if (instanceRows.length === 0) {
    const templateIds = activeAssignments.map((a) => a.template_id);
    const { data: existing, error: exFetchErr } = await supabaseAdmin
      .from("weekly_sessions")
      .select("id, week_start, template_id, session_templates(id, title)")
      .eq("team_id", TEAM_ID)
      .eq("week_start", weekStart)
      .in("template_id", templateIds);
    if (exFetchErr) return NextResponse.json({ error: exFetchErr.message }, { status: 500 });
    instanceRows = (existing ?? []) as WeeklySessionRow[];
  }

  if (instanceRows.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // 4. Fetch exercises for all templates.
  const templateIds = Array.from(new Set(instanceRows.map((r) => r.template_id)));

  const { data: exercises, error: eErr } = await supabaseAdmin
    .from("session_template_exercises")
    .select("id, template_id, name, sort_order, target_sets, target_reps")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  const exercisesByTemplate = (exercises ?? []).reduce<Record<string, ExerciseRow[]>>((acc, ex) => {
    const r = ex as ExerciseRow;
    acc[r.template_id] = acc[r.template_id] ?? [];
    acc[r.template_id].push(r);
    return acc;
  }, {});

  return NextResponse.json(
    {
      sessions: instanceRows.map((a) => ({
        id: a.id,
        week_start: a.week_start,
        template_id: a.template_id,
        template_title: (a.session_templates as { title?: string } | null)?.title ?? null,
        exercises: (exercisesByTemplate[a.template_id] ?? []).map((ex) => ({
          id: ex.id,
          name: ex.name,
          sort_order: ex.sort_order,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
