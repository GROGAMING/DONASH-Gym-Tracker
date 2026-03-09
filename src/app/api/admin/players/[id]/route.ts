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

  // Step 1: Remove the team_members link
  const { error: memberErr } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("team_id", TEAM_ID)
    .eq("user_id", userId);

  if (memberErr) {
    if (process.env.NODE_ENV !== "production") {
      console.error("team_members delete failed", memberErr);
    }
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Step 2: Null out users.team_id so the player no longer appears in team roster
  // (history/logs are keyed by user_id and are preserved)
  const { error: userErr } = await supabaseAdmin
    .from("users")
    .update({ team_id: null })
    .eq("id", userId)
    .eq("team_id", TEAM_ID);

  if (userErr) {
    if (process.env.NODE_ENV !== "production") {
      console.error("users.team_id null failed", userErr);
    }
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
