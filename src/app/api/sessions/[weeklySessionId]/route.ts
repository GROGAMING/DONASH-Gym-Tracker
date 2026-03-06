import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WeeklySessionRow = {
  id: string;
  week_start: string;
  template_id: string;
  session_templates?: { id?: string; title?: string } | null;
};

type ExerciseRow = {
  id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
};

export async function GET(_req: NextRequest, ctx: { params: { weeklySessionId: string } }) {
  const weeklySessionId = ctx.params.weeklySessionId;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // TEAM_ID is intentional here: the weeklySessionId alone does not carry a team
  // signal. Scoping by TEAM_ID prevents cross-tenant data leakage in the current
  // single-deployment model. A multi-tenant URL scheme would embed the team slug.
  const { data: session, error: sErr } = await supabase
    .from("weekly_sessions")
    .select("id, week_start, template_id, session_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .eq("id", weeklySessionId)
    .maybeSingle();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const s = session as WeeklySessionRow;

  const { data: exercises, error: eErr } = await supabase
    .from("session_template_exercises")
    .select("id, name, sort_order, target_sets, target_reps")
    .eq("template_id", s.template_id)
    .order("sort_order", { ascending: true });

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  return NextResponse.json(
    {
      session: {
        id: s.id,
        week_start: s.week_start,
        template_id: s.template_id,
        template_title: s.session_templates?.title ?? null,
        exercises: (exercises ?? []).map((row) => {
          const ex = row as ExerciseRow;
          return {
            id: ex.id,
            name: ex.name,
            sort_order: ex.sort_order,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
          };
        }),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
