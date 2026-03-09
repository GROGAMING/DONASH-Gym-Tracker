import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO } from "@/lib/week";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WeeklySessionRow = {
  id: string;
  week_start: string;
  template_id: string;
  notes: string | null;
  created_at: string;
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

  const weekStart = mondayWeekStartISO(new Date());

  // 1. Fetch all weekly_sessions rows for this team, newest first.
  //    These are the admin-assigned sessions and persist until removed.
  const { data: allRows, error: aErr } = await supabase
    .from("weekly_sessions")
    .select("id, week_start, template_id, notes, created_at, session_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const allAssigned = (allRows ?? []) as WeeklySessionRow[];
  if (allAssigned.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // 2. For each distinct template_id that has an existing assignment, ensure a row
  //    exists for the CURRENT week_start. This is the weekly-reset mechanism:
  //    players see a fresh instance each Monday, keyed by a new weekly_session_id.
  //    We only auto-create — never auto-delete old rows (they anchor history).
  const templateIdsSeen = Array.from(new Set(allAssigned.map((r) => r.template_id)));
  const currentWeekRows = allAssigned.filter((r) => r.week_start === weekStart);
  const currentWeekTemplateIds = new Set(currentWeekRows.map((r) => r.template_id));

  // Templates that have an assignment but no current-week row yet
  const missingTemplateIds = templateIdsSeen.filter((tid) => !currentWeekTemplateIds.has(tid));

  if (missingTemplateIds.length > 0) {
    // Insert new weekly_sessions rows for the current week (one per missing template).
    // Use supabaseAdmin to bypass RLS since this is a server-side auto-create.
    const insertRows = missingTemplateIds.map((tid) => ({
      team_id: TEAM_ID,
      template_id: tid,
      week_start: weekStart,
    }));

    const { data: inserted, error: iErr } = await supabaseAdmin
      .from("weekly_sessions")
      .insert(insertRows)
      .select("id, week_start, template_id, notes, created_at, session_templates(id, title)");

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    // Merge newly inserted rows into our current-week set
    if (inserted) {
      currentWeekRows.push(...(inserted as WeeklySessionRow[]));
    }
  }

  if (currentWeekRows.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // 3. Fetch exercises for all templates in the current-week rows.
  const templateIds = Array.from(new Set(currentWeekRows.map((r) => r.template_id)));

  const { data: exercises, error: eErr } = await supabase
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
      sessions: currentWeekRows.map((a) => ({
        id: a.id,
        week_start: a.week_start,
        created_at: a.created_at,
        template_id: a.template_id,
        notes: a.notes ?? "",
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
