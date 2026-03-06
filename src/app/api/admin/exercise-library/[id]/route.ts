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

  // Only allow deleting team-specific exercises. Global exercises (team_id IS NULL)
  // are shared across all teams and cannot be deleted through admin.
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("exercise_library")
    .select("id, team_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((row as { team_id: string | null }).team_id === null) {
    return NextResponse.json({ error: "Cannot delete a shared global exercise" }, { status: 403 });
  }
  if ((row as { team_id: string | null }).team_id !== TEAM_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("exercise_library")
    .delete()
    .eq("id", id)
    .eq("team_id", TEAM_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
