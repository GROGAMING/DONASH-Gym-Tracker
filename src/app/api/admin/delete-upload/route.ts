import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export async function POST(req: Request) {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uploadId } = await req.json();
  if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });

  const { data: row, error: rErr } = await supabaseAdmin
    .from("uploads")
    .select("id, image_path")
    .eq("id", uploadId)
    .eq("team_id", TEAM_ID)
    .single();

  if (rErr) {
    if (rErr.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: sErr } = await supabaseAdmin.storage.from("gym-photos").remove([row.image_path]);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { error: uErr } = await supabaseAdmin
    .from("uploads")
    .update({ status: "deleted" })
    .eq("id", uploadId)
    .eq("team_id", TEAM_ID);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
