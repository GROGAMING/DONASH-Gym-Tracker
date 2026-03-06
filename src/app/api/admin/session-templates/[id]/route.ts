import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Check template belongs to this team
  const { data: template, error: fetchErr } = await supabaseAdmin
    .from("session_templates")
    .select("id")
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  // Check if assigned to any weekly_sessions
  const { count, error: countErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id)
    .eq("team_id", TEAM_ID);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if (typeof count === "number" && count > 0) {
    return NextResponse.json(
      { error: "Template is assigned to a session; unassign it first." },
      { status: 409 },
    );
  }

  // Delete template (exercises cascade via FK)
  const { error: delErr } = await supabaseAdmin
    .from("session_templates")
    .delete()
    .eq("id", id)
    .eq("team_id", TEAM_ID);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
