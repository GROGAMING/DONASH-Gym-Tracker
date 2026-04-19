import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("weekly_sessions")
    .delete()
    .eq("id", id)
    .eq("team_id", TEAM_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    notes?: unknown;
    assignmentType?: unknown;
    assignedUserIds?: unknown;
  } | null;

  const notes = typeof body?.notes === "string" ? body.notes : "";

  const patch: Record<string, unknown> = { notes };
  let assignedUserIds: string[] = [];
  let updatingAssignment = false;
  let newAssignmentType = "all";

  if (body?.assignmentType !== undefined) {
    updatingAssignment = true;
    newAssignmentType = body.assignmentType === "selected" ? "selected" : "all";
    const rawIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : [];
    assignedUserIds = rawIds.filter((x): x is string => typeof x === "string" && x.length > 0);

    if (newAssignmentType === "selected" && assignedUserIds.length === 0) {
      return NextResponse.json({ error: "Select at least one team member." }, { status: 400 });
    }

    patch.assignment_type = newAssignmentType;
  }

  // Fetch the current weekly_session row so we know template_id + week_start
  // (assigned_sessions joins via those columns, not weekly_session_id)
  const { data: currentSession, error: csErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id, template_id, week_start")
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .single();

  if (csErr || !currentSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { template_id: templateId, week_start: weekStart } = currentSession as {
    id: string;
    template_id: string;
    week_start: string;
  };

  const { data, error } = await supabaseAdmin
    .from("weekly_sessions")
    .update(patch)
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .select("id, notes, assignment_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync assigned_sessions rows when assignment target is being updated.
  // Join key is template_id + week_start — NOT weekly_session_id (column doesn't exist).
  if (updatingAssignment) {
    // Delete existing per-user rows for this template+week
    const { error: delErr } = await supabaseAdmin
      .from("assigned_sessions")
      .delete()
      .eq("template_id", templateId)
      .eq("week_start", weekStart)
      .not("user_id", "is", null);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Insert new per-user rows when type = 'selected'
    if (newAssignmentType === "selected" && assignedUserIds.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("assigned_sessions")
        .insert(
          assignedUserIds.map((uid) => ({
            template_id: templateId,
            week_start: weekStart,
            user_id: uid,
          })),
        );
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // Re-fetch current assigned user IDs for consistent response shape
  const { data: asRows } = await supabaseAdmin
    .from("assigned_sessions")
    .select("user_id")
    .eq("template_id", templateId)
    .eq("week_start", weekStart)
    .not("user_id", "is", null);

  const currentAssignedIds = (asRows ?? []).map((r: { user_id: string }) => r.user_id);

  return NextResponse.json({ ...data, assigned_user_ids: currentAssignedIds });
}
