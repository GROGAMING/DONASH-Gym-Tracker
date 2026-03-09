import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = params.id?.trim();
  if (!userId) return NextResponse.json({ error: "Missing player id" }, { status: 400 });

  // Only remove the team_members link — do NOT delete user record or history
  const { error } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("team_id", TEAM_ID)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
