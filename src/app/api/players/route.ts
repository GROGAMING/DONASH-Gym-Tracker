export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,name")
    .eq("team_id", TEAM_ID)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as { id: string; name: string }[]);
}
