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

  // Fetch global exercises (team_id IS NULL) and team-specific exercises together.
  // We do two queries and merge in JS so we can apply the same search filter to both
  // without needing a Supabase OR filter on a nullable column.
  let globalQuery = supabaseAdmin
    .from("exercise_library")
    .select("id, name, category, team_id")
    .is("team_id", null)
    .order("name", { ascending: true })
    .limit(200);

  let teamQuery = supabaseAdmin
    .from("exercise_library")
    .select("id, name, category, team_id")
    .eq("team_id", TEAM_ID)
    .order("name", { ascending: true })
    .limit(200);

  if (q.length > 0) {
    globalQuery = globalQuery.ilike("name", `%${q}%`);
    teamQuery   = teamQuery.ilike("name", `%${q}%`);
  }

  const [{ data: globalData, error: gErr }, { data: teamData, error: tErr }] =
    await Promise.all([globalQuery, teamQuery]);

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Merge: team-specific exercises shadow global ones with the same name.
  // Build a map keyed by lowercase name; team rows overwrite global rows.
  type Row = { id: string; name: string; category: string; team_id: string | null };
  const byName = new Map<string, Row>();
  for (const row of (globalData ?? []) as Row[]) {
    byName.set(row.name.toLowerCase(), row);
  }
  for (const row of (teamData ?? []) as Row[]) {
    byName.set(row.name.toLowerCase(), row);
  }

  const merged = Array.from(byName.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 200)
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      is_global: r.team_id === null,
    }));

  return NextResponse.json(merged);
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
      // Check for an existing team-specific row with this name.
      const { data: existing } = await supabaseAdmin
        .from("exercise_library")
        .select("id, name, category")
        .eq("team_id", TEAM_ID)
        .eq("name", name)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ ...existing, is_global: false }, { status: 200 });
      }
      // May be a global exercise with the same name — that's fine, create team copy.
      // But if it already exists globally and the unique index blocked us, return the global.
      const { data: global } = await supabaseAdmin
        .from("exercise_library")
        .select("id, name, category")
        .is("team_id", null)
        .eq("name", name)
        .maybeSingle();
      return NextResponse.json(global ? { ...global, is_global: true } : { error: "Duplicate" }, { status: global ? 200 : 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
