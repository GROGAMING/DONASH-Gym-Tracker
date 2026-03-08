import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) return NextResponse.json({ error: "Player name is required" }, { status: 400 });

  // Duplicate check: prevent two players with same name on the same team
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("team_id", TEAM_ID)
    .ilike("name", name)
    .maybeSingle();

  if (checkErr) {
    return NextResponse.json({ error: checkErr.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: `A player named "${existing.name}" already exists on this team.` },
      { status: 409 },
    );
  }

  // Insert new user row — users table uses: id (uuid), name (text), team_id (text)
  const { data: newUser, error: insertErr } = await supabaseAdmin
    .from("users")
    .insert({ name, team_id: TEAM_ID })
    .select("id, name")
    .single();

  if (insertErr || !newUser) {
    return NextResponse.json({ error: insertErr?.message || "Failed to create player" }, { status: 500 });
  }

  const userId = (newUser as { id: string; name: string }).id;

  // Insert team_members row linking this user to the current team
  const { error: memberErr } = await supabaseAdmin
    .from("team_members")
    .insert({ team_id: TEAM_ID, user_id: userId });

  if (memberErr) {
    // team_members insert failed — still return the user but surface the warning
    return NextResponse.json(
      {
        id: userId,
        name: (newUser as { id: string; name: string }).name,
        warning: `Player created but team membership failed: ${memberErr.message}`,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ id: userId, name: (newUser as { id: string; name: string }).name });
}
