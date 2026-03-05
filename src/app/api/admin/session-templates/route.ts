import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

type TemplateRow = {
  id: string;
  title: string;
  exercises: unknown;
  created_at: string;
};

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

function normalizeExercises(exercises: unknown): string[] {
  if (!Array.isArray(exercises)) return [];
  return exercises
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("session_templates")
    .select("id, title, exercises, created_at")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  const templates = (data ?? []).map((t: TemplateRow) => ({
    id: t.id,
    title: t.title,
    exercises: normalizeExercises(t.exercises),
    created_at: t.created_at,
  }));

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; exercises?: unknown }
    | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const exercises = normalizeExercises(body?.exercises);

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
  if (exercises.length === 0) return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("session_templates")
    .insert({ team_id: TEAM_ID, title, exercises })
    .select("id, title, exercises, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  const row = data as TemplateRow;
  return NextResponse.json({
    id: row.id,
    title: row.title,
    exercises: normalizeExercises(row.exercises),
    created_at: row.created_at,
  });
}
