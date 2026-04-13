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

  if (body?.assignmentType !== undefined) {
    const assignmentType = body.assignmentType === "selected" ? "selected" : "all";
    const rawIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : [];
    const assignedUserIds: string[] | null =
      assignmentType === "selected" && rawIds.length > 0
        ? rawIds.filter((x): x is string => typeof x === "string" && x.length > 0)
        : null;

    if (assignmentType === "selected" && (!assignedUserIds || assignedUserIds.length === 0)) {
      return NextResponse.json({ error: "Select at least one team member." }, { status: 400 });
    }

    patch.assignment_type = assignmentType;
    patch.assigned_user_ids = assignedUserIds;
  }

  const { data, error } = await supabaseAdmin
    .from("weekly_sessions")
    .update(patch)
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .select("id, notes, assignment_type, assigned_user_ids")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
