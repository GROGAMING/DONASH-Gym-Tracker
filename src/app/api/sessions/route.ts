import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WeeklySessionRow = {
  id: string;
  week_start: string;
  template_id: string;
  notes: string;
  assigned_at: string;
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // TEAM_ID is intentional here: this endpoint is called before a player is selected.
  // Filter by is_active=true — sessions persist until admin removes them.
  const { data: assigned, error: aErr } = await supabase
    .from("weekly_sessions")
    .select("id, week_start, template_id, notes, assigned_at, session_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  const rows = (assigned ?? []) as WeeklySessionRow[];

  if (rows.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const templateIds = Array.from(new Set(rows.map((r) => r.template_id)));

  const { data: exercises, error: eErr } = await supabase
    .from("session_template_exercises")
    .select("id, template_id, name, sort_order, target_sets, target_reps")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  if (eErr) {
    return NextResponse.json({ error: eErr.message }, { status: 500 });
  }

  const exercisesByTemplate = (exercises ?? []).reduce<Record<string, ExerciseRow[]>>((acc, ex) => {
    const r = ex as ExerciseRow;
    acc[r.template_id] = acc[r.template_id] ?? [];
    acc[r.template_id].push(r);
    return acc;
  }, {});

  return NextResponse.json(
    {
      sessions: rows.map((a) => ({
        id: a.id,
        week_start: a.week_start,
        assigned_at: a.assigned_at ?? null,
        template_id: a.template_id,
        notes: a.notes ?? "",
        template_title: a.session_templates?.title ?? null,
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
