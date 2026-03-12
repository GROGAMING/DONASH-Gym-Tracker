import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    exercises?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const rawExercises = Array.isArray(body?.exercises) ? body.exercises : [];

  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const exercises = rawExercises
    .map((x) => {
      const row = x as { name?: unknown; target_sets?: unknown; target_reps?: unknown; block_label?: unknown; block_color?: unknown; group_index?: unknown; coaching_notes?: unknown; rest_seconds?: unknown };
      const name = typeof row?.name === "string" ? row.name.trim() : "";
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

  if (exercises.length === 0) return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });

  // Verify template belongs to this team
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("session_templates")
    .select("id")
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  // Update title
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("session_templates")
    .update({ title })
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .select("id, title, created_at")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Replace exercises: delete all existing rows, then re-insert
  const { error: delErr } = await supabaseAdmin
    .from("session_template_exercises")
    .delete()
    .eq("template_id", id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const exerciseInserts = exercises.map((ex, idx) => ({
    template_id: id,
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

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  const row = updated as { id: string; title: string; created_at: string };
  return NextResponse.json({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    exercises: (exRows ?? []).map((ex) => {
      const e = ex as { id: string; name: string; sort_order: number; target_sets: number | null; target_reps: string | null; block_label: string | null; block_color: string | null; group_index: number; coaching_notes: string | null; rest_seconds: number | null };
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Check template belongs to this team
  const { data: template, error: fetchErr } = await supabaseAdmin
    .from("session_templates")
    .select("id")
    .eq("id", id)
    .eq("team_id", TEAM_ID)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  // Check if assigned to any weekly_sessions
  const { count, error: countErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id)
    .eq("team_id", TEAM_ID);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if (typeof count === "number" && count > 0) {
    return NextResponse.json(
      { error: "Template is assigned to a session; unassign it first." },
      { status: 409 },
    );
  }

  // Delete template (exercises cascade via FK)
  const { error: delErr } = await supabaseAdmin
    .from("session_templates")
    .delete()
    .eq("id", id)
    .eq("team_id", TEAM_ID);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
