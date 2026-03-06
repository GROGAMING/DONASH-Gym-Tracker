import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // TEAM_ID is intentional here: this is the player-select endpoint — the player
  // has not been chosen yet, so there is no user context to derive team from.
  // It returns only the players for this deployment's team.
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,name")
    .eq("team_id", TEAM_ID)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "no-store" },
  });
}
