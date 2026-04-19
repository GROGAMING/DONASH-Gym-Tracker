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
  assignment_type: string | null;
  session_templates?: { id?: string; title?: string } | null;
};

type ExerciseRow = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
  block_label: string | null;
  block_color: string | null;
  group_index: number;
  coaching_notes: string | null;
  rest_seconds: number | null;
};

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId") ?? null;

  const weekStart = mondayWeekStartISO(new Date());

  // 1. Fetch all weekly_sessions rows for this team, newest first.
  //    These are the admin-assigned sessions and persist until removed.
  const { data: allRows, error: aErr } = await supabase
    .from("weekly_sessions")
    .select("id, week_start, template_id, notes, created_at, assignment_type, session_templates(id, title)")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const allFetched = (allRows ?? []) as WeeklySessionRow[];

  // Separate sessions by type so we can resolve 'selected' visibility via assigned_sessions.
  const allSessions = allFetched;
  const selectedTypeSessions = allSessions.filter((r) => (r.assignment_type ?? "all") === "selected");

  // For 'selected' sessions, fetch which users are assigned via the join table.
  // We use supabaseAdmin here so RLS doesn't block the server-side read.
  let assignedSessionUserIds: Record<string, string[]> = {};
  if (selectedTypeSessions.length > 0) {
    const selectedIds = selectedTypeSessions.map((r) => r.id);
    const { data: asRows, error: asErr } = await supabaseAdmin
      .from("assigned_sessions")
      .select("weekly_session_id, user_id")
      .in("weekly_session_id", selectedIds);
    if (asErr) return NextResponse.json({ error: asErr.message }, { status: 500 });
    assignedSessionUserIds = ((asRows ?? []) as { weekly_session_id: string; user_id: string }[]).reduce<
      Record<string, string[]>
    >((acc, r) => {
      acc[r.weekly_session_id] = acc[r.weekly_session_id] ?? [];
      acc[r.weekly_session_id].push(r.user_id);
      return acc;
    }, {});
  }

  // Filter by assignment:
  //   'all'      → visible to everyone (or when no playerId provided)
  //   'selected' → visible only if playerId is in assigned_sessions for this session
  const allAssigned = allSessions.filter((r) => {
    const aType = r.assignment_type ?? "all";
    if (aType === "all") return true;
    if (!playerId) return false; // no player context → hide 'selected' sessions
    const allowed = assignedSessionUserIds[r.id] ?? [];
    return allowed.includes(playerId);
  });

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
    // Carry forward assignment_type and assigned_user_ids from the most recent row for each template
    const latestByTemplate = new Map<string, WeeklySessionRow>();
    for (const r of allAssigned) {
      if (!latestByTemplate.has(r.template_id)) latestByTemplate.set(r.template_id, r);
    }

    const insertRows = missingTemplateIds.map((tid) => {
      const src = latestByTemplate.get(tid);
      return {
        team_id: TEAM_ID,
        template_id: tid,
        week_start: weekStart,
        assignment_type: src?.assignment_type ?? "all",
      };
    });

    const { data: inserted, error: iErr } = await supabaseAdmin
      .from("weekly_sessions")
      .insert(insertRows)
      .select("id, week_start, template_id, notes, created_at, assignment_type, session_templates(id, title)");

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    // For any auto-created 'selected' sessions, copy the assigned_sessions rows from the source
    if (inserted) {
      const newRows = inserted as WeeklySessionRow[];
      const selectedNew = newRows.filter((r) => (r.assignment_type ?? "all") === "selected");
      if (selectedNew.length > 0) {
        const copyInserts: { weekly_session_id: string; user_id: string }[] = [];
        for (const newRow of selectedNew) {
          const srcRow = latestByTemplate.get(newRow.template_id);
          if (srcRow) {
            const srcUserIds = assignedSessionUserIds[srcRow.id] ?? [];
            for (const uid of srcUserIds) {
              copyInserts.push({ weekly_session_id: newRow.id, user_id: uid });
            }
          }
        }
        if (copyInserts.length > 0) {
          await supabaseAdmin.from("assigned_sessions").insert(copyInserts);
        }
      }
      currentWeekRows.push(...newRows);
    }
  }

  if (currentWeekRows.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // 3. Fetch exercises for all templates in the current-week rows.
  const templateIds = Array.from(new Set(currentWeekRows.map((r) => r.template_id)));

  const { data: exercises, error: eErr } = await supabase
    .from("session_template_exercises")
    .select("id, template_id, name, sort_order, target_sets, target_reps, block_label, block_color, group_index, coaching_notes, rest_seconds")
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
          block_label: ex.block_label,
          block_color: ex.block_color,
          group_index: ex.group_index,
          coaching_notes: ex.coaching_notes,
          rest_seconds: ex.rest_seconds,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
