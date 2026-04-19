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

  if (body?.assignmentType !== undefined) {
    updatingAssignment = true;
    const assignmentType = body.assignmentType === "selected" ? "selected" : "all";
    const rawIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : [];
    assignedUserIds = rawIds.filter((x): x is string => typeof x === "string" && x.length > 0);

    if (assignmentType === "selected" && assignedUserIds.length === 0) {
      return NextResponse.json({ error: "Select at least one team member." }, { status: 400 });
    }

    patch.assignment_type = assignmentType;
  }

  const { data, error } = await supabaseAdmin
    .from("weekly_sessions")
    .update(patch)
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .select("id, notes, assignment_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync assigned_sessions rows when assignment target is being updated
  if (updatingAssignment) {
    const assignmentType = patch.assignment_type as string;

    // Delete all existing per-player assignments for this session first
    const { error: delErr } = await supabaseAdmin
      .from("assigned_sessions")
      .delete()
      .eq("weekly_session_id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Insert new per-player rows when type = 'selected'
    if (assignmentType === "selected" && assignedUserIds.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("assigned_sessions")
        .insert(assignedUserIds.map((uid) => ({ weekly_session_id: id, user_id: uid })));
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // Re-fetch the current assigned_user_ids to return consistent shape
  const { data: asRows } = await supabaseAdmin
    .from("assigned_sessions")
    .select("user_id")
    .eq("weekly_session_id", id);

  const currentAssignedIds = (asRows ?? []).map((r: { user_id: string }) => r.user_id);

  return NextResponse.json({ ...data, assigned_user_ids: currentAssignedIds });
}
