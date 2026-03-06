import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  let query = supabaseAdmin
    .from("exercise_library")
    .select("id, name, category")
    .eq("team_id", TEAM_ID)
    .order("name", { ascending: true })
    .limit(50);

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: unknown; category?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("exercise_library")
    .insert({ team_id: TEAM_ID, name, category })
    .select("id, name, category")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("exercise_library")
        .select("id, name, category")
        .eq("team_id", TEAM_ID)
        .eq("name", name)
        .single();
      return NextResponse.json(existing ?? { error: "Duplicate" }, { status: existing ? 200 : 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
