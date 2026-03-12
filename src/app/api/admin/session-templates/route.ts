import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

type TemplateRow = {
  id: string;
  title: string;
  created_at: string;
};

type TemplateExerciseRow = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
  block_label: string | null;
  block_color: string | null;
  group_index: number;
  coaching_notes: string | null;
  rest_seconds: number | null;
};

function isAdmin() {
  return cookies().get("admin_authed")?.value === "1";
}

function normalizeTargetSets(x: unknown): number | null {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  const v = Math.floor(x);
  if (v <= 0) return null;
  return v;
}

function normalizeTargetReps(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const v = x.trim();
  if (!v) return null;
  return v;
}

function normalizeExerciseName(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("session_templates")
    .select("id, title, created_at")
    .eq("team_id", TEAM_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  const templates = (data ?? []) as TemplateRow[];
  const templateIds = templates.map((t) => t.id);

  let exercisesByTemplate: Record<string, TemplateExerciseRow[]> = {};
  if (templateIds.length > 0) {
    const { data: exRows, error: exErr } = await supabaseAdmin
      .from("session_template_exercises")
      .select("id, template_id, name, sort_order, target_sets, target_reps, block_label, block_color, group_index, coaching_notes, rest_seconds")
      .in("template_id", templateIds)
      .order("sort_order", { ascending: true });

    if (exErr) {
      return NextResponse.json({ error: exErr.message, code: exErr.code }, { status: 500 });
    }

    exercisesByTemplate = (exRows ?? []).reduce<Record<string, TemplateExerciseRow[]>>((acc, row) => {
      const r = row as TemplateExerciseRow;
      acc[r.template_id] = acc[r.template_id] ?? [];
      acc[r.template_id].push(r);
      return acc;
    }, {});
  }

  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      title: t.title,
      created_at: t.created_at,
      exercises: (exercisesByTemplate[t.id] ?? []).map((ex) => ({
        id: ex.id,
        name: ex.name,
        sort_order: ex.sort_order,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        block_label: ex.block_label,
        block_color: ex.block_color,
        group_index: ex.group_index,
        coaching_notes: ex.coaching_notes,
        rest_seconds: ex.rest_seconds,
      })),
    })),
  );
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        title?: unknown;
        exercises?: unknown;
      }
    | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const rawExercises = Array.isArray(body?.exercises) ? body?.exercises : [];

  const exercises = rawExercises
    .map((x) => {
      const row = x as { name?: unknown; target_sets?: unknown; target_reps?: unknown; block_label?: unknown; block_color?: unknown; group_index?: unknown; coaching_notes?: unknown; rest_seconds?: unknown };
      const name = normalizeExerciseName(row?.name);
      return {
        name,
        target_sets: normalizeTargetSets(row?.target_sets),
        target_reps: normalizeTargetReps(row?.target_reps),
        block_label: typeof row?.block_label === "string" ? row.block_label.trim() || null : null,
        block_color: typeof row?.block_color === "string" ? row.block_color.trim() || null : null,
        group_index: typeof row?.group_index === "number" && Number.isFinite(row.group_index) ? Math.max(0, Math.floor(row.group_index)) : 0,
        coaching_notes: typeof row?.coaching_notes === "string" ? row.coaching_notes.trim() || null : null,
        rest_seconds: typeof row?.rest_seconds === "number" && Number.isFinite(row.rest_seconds) && row.rest_seconds > 0 ? Math.floor(row.rest_seconds) : null,
      };
    })
    .filter((x) => x.name.length > 0);

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
  if (exercises.length === 0) return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("session_templates")
    .insert({ team_id: TEAM_ID, title })
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  const row = data as TemplateRow;

  const exerciseInserts = exercises.map((ex, idx) => ({
    template_id: row.id,
    name: ex.name,
    sort_order: idx + 1,
    target_sets: ex.target_sets,
    target_reps: ex.target_reps,
    block_label: ex.block_label,
    block_color: ex.block_color,
    group_index: ex.group_index,
    coaching_notes: ex.coaching_notes,
    rest_seconds: ex.rest_seconds,
  }));

  const { data: exRows, error: exErr } = await supabaseAdmin
    .from("session_template_exercises")
    .insert(exerciseInserts)
    .select("id, template_id, name, sort_order, target_sets, target_reps, block_label, block_color, group_index, coaching_notes, rest_seconds")
    .order("sort_order", { ascending: true });

  if (exErr) {
    return NextResponse.json({ error: exErr.message, code: exErr.code }, { status: 500 });
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    exercises: (exRows ?? []).map((ex) => {
      const e = ex as TemplateExerciseRow;
      return {
        id: e.id,
        name: e.name,
        sort_order: e.sort_order,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        block_label: e.block_label,
        block_color: e.block_color,
        group_index: e.group_index,
        coaching_notes: e.coaching_notes,
        rest_seconds: e.rest_seconds,
      };
    }),
  });
}
