import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO } from "@/lib/week";

type AssignmentRow = {
  id: string;
  week_start: string;
  template_id: string;
  notes: string;
  created_at: string;
  assignment_type: string;
};

// assigned_sessions real columns (confirmed from Supabase):
//   id, template_id, week_start, created_at, user_id (added by migration)
// Joins to weekly_sessions via template_id + week_start (NOT weekly_session_id)
type AssignedSessionRow = {
  template_id: string;
  week_start: string;
  user_id: string | null;
};

type TemplateRow = {
  id: string;
  title: string;
};

type TemplateExerciseRow = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
};

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

export async function GET(_req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return all rows for this team ordered by created_at desc (latest first).
  // Rows persist until admin hard-deletes them.
  const { data: rows, error: aErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id, week_start, template_id, notes, created_at, assignment_type")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (aErr) {
    return NextResponse.json({ error: aErr.message, code: aErr.code }, { status: 500 });
  }

  const assignments = (rows ?? []) as AssignmentRow[];

  if (assignments.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const templateIds = Array.from(new Set(assignments.map((a) => a.template_id)));

  // Fetch per-user assignments from assigned_sessions.
  // Join key is template_id + week_start (NOT weekly_session_id — that column doesn't exist).
  // Only rows with user_id IS NOT NULL are per-user rows.
  const { data: asRows, error: asErr } = await supabaseAdmin
    .from("assigned_sessions")
    .select("template_id, week_start, user_id")
    .in("template_id", templateIds.length > 0 ? templateIds : ["00000000-0000-0000-0000-000000000000"])
    .not("user_id", "is", null);

  if (asErr) {
    return NextResponse.json({ error: asErr.message, code: asErr.code }, { status: 500 });
  }

  // Build map: `${template_id}|${week_start}` -> user_id[]
  const assignedUsersMap = ((asRows ?? []) as AssignedSessionRow[]).reduce<Record<string, string[]>>(
    (acc, r) => {
      if (!r.user_id) return acc;
      const key = `${r.template_id}|${r.week_start}`;
      acc[key] = acc[key] ?? [];
      acc[key].push(r.user_id);
      return acc;
    },
    {},
  );

  const [{ data: templates, error: tErr }, { data: exRows, error: exErr }] = await Promise.all([
    supabaseAdmin
      .from("session_templates")
      .select("id, title")
      .eq("team_id", TEAM_ID)
      .in("id", templateIds),
    supabaseAdmin
      .from("session_template_exercises")
      .select("id, template_id, name, sort_order, target_sets, target_reps")
      .in("template_id", templateIds)
      .order("sort_order", { ascending: true }),
  ]);

  if (tErr) return NextResponse.json({ error: tErr.message, code: tErr.code }, { status: 500 });
  if (exErr) return NextResponse.json({ error: exErr.message, code: exErr.code }, { status: 500 });

  const templateMap = new Map((templates ?? []).map((t) => [(t as TemplateRow).id, t as TemplateRow]));
  const exercisesByTemplate = (exRows ?? []).reduce<Record<string, TemplateExerciseRow[]>>((acc, row) => {
    const r = row as TemplateExerciseRow;
    acc[r.template_id] = acc[r.template_id] ?? [];
    acc[r.template_id].push(r);
    return acc;
  }, {});

  return NextResponse.json({
    assignments: assignments.map((a) => {
      const t = templateMap.get(a.template_id) ?? null;
      const key = `${a.template_id}|${a.week_start}`;
      return {
        id: a.id,
        week_start: a.week_start,
        template_id: a.template_id,
        notes: a.notes ?? "",
        created_at: a.created_at,
        assignment_type: a.assignment_type ?? "all",
        assigned_user_ids: assignedUsersMap[key] ?? [],
        template: t
          ? {
              id: t.id,
              title: t.title,
              exercises: (exercisesByTemplate[t.id] ?? []).map((ex) => ({
                id: ex.id,
                name: ex.name,
                sort_order: ex.sort_order,
                target_sets: ex.target_sets,
                target_reps: ex.target_reps,
              })),
            }
          : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { templateId?: unknown; weekStart?: unknown; assignmentType?: unknown; assignedUserIds?: unknown }
    | null;

  const templateId = typeof body?.templateId === "string" ? body.templateId : "";

  if (!templateId) return NextResponse.json({ error: "Missing templateId" }, { status: 400 });

  const assignmentType = body?.assignmentType === "selected" ? "selected" : "all";
  const rawIds = Array.isArray(body?.assignedUserIds) ? body.assignedUserIds : [];
  const assignedUserIds: string[] =
    rawIds.filter((id): id is string => typeof id === "string" && id.length > 0);

  if (assignmentType === "selected" && assignedUserIds.length === 0) {
    return NextResponse.json({ error: "Select at least one team member." }, { status: 400 });
  }

  const { data: template, error: tErr } = await supabaseAdmin
    .from("session_templates")
    .select("id")
    .eq("team_id", TEAM_ID)
    .eq("id", templateId)
    .single();

  if (tErr || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Validate selected user IDs exist in users table for this team
  if (assignmentType === "selected" && assignedUserIds.length > 0) {
    const { data: userCheck, error: ucErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("team_id", TEAM_ID)
      .in("id", assignedUserIds);
    if (ucErr) return NextResponse.json({ error: ucErr.message }, { status: 500 });
    const validIds = new Set((userCheck ?? []).map((r: { id: string }) => r.id));
    const invalid = assignedUserIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "One or more selected players are not on this team." }, { status: 400 });
    }
  }

  const weekStart =
    typeof body?.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart)
      ? mondayWeekStartISO(new Date(body.weekStart + "T12:00:00"))
      : mondayWeekStartISO(new Date());

  const { data: assignment, error: aErr } = await supabaseAdmin
    .from("weekly_sessions")
    .insert({
      team_id: TEAM_ID,
      week_start: weekStart,
      template_id: templateId,
      assignment_type: assignmentType,
    })
    .select("id, week_start, template_id, notes, created_at, assignment_type")
    .single();

  if (aErr) {
    return NextResponse.json({ error: aErr.message, code: aErr.code }, { status: 500 });
  }

  const newWeekStart = (assignment as { week_start: string }).week_start;

  // Write per-user rows into assigned_sessions when type = 'selected'.
  // Join key is template_id + week_start (real schema — no weekly_session_id column).
  if (assignmentType === "selected" && assignedUserIds.length > 0) {
    const { error: asErr } = await supabaseAdmin
      .from("assigned_sessions")
      .insert(
        assignedUserIds.map((uid) => ({
          template_id: templateId,
          week_start: newWeekStart,
          user_id: uid,
        })),
      );
    if (asErr) {
      // Roll back the weekly_sessions row so we don't leave orphaned data
      await supabaseAdmin.from("weekly_sessions").delete().eq("id", (assignment as { id: string }).id);
      return NextResponse.json({ error: asErr.message, code: asErr.code }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, assignment: { ...assignment, assigned_user_ids: assignedUserIds } });
}
