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

  // Soft-delete: set is_active=false so player_session_logs FK refs are preserved
  const { error } = await supabaseAdmin
    .from("weekly_sessions")
    .update({ is_active: false })
    .eq("id", id)
    .eq("team_id", TEAM_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { notes?: unknown } | null;
  const notes = typeof body?.notes === "string" ? body.notes : "";

  const { data, error } = await supabaseAdmin
    .from("weekly_sessions")
    .update({ notes })
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .select("id, notes")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
