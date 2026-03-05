import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO, mondayFromAnyDateISO } from "@/lib/week";

type AssignmentRow = {
  id: string;
  week_start: string;
  template_id: string;
  created_at: string;
};

type TemplateRow = {
  id: string;
  title: string;
  exercises: unknown;
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

function normalizeWeekStart(x: unknown): string {
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) return mondayFromAnyDateISO(x);
  return mondayWeekStartISO(new Date());
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const weekStart = normalizeWeekStart(url.searchParams.get("weekStart"));

  const { data: assignment, error: aErr } = await supabaseAdmin
    .from("weekly_sessions")
    .select("id, week_start, template_id, created_at")
    .eq("team_id", TEAM_ID)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (aErr) {
    return NextResponse.json({ error: aErr.message, code: aErr.code }, { status: 500 });
  }

  if (!assignment) {
    return NextResponse.json({ weekStart, assignment: null });
  }

  const a = assignment as AssignmentRow;

  const { data: template, error: tErr } = await supabaseAdmin
    .from("session_templates")
    .select("id, title, exercises")
    .eq("team_id", TEAM_ID)
    .eq("id", a.template_id)
    .maybeSingle();

  if (tErr) {
    return NextResponse.json({ error: tErr.message, code: tErr.code }, { status: 500 });
  }

  const t = template as TemplateRow | null;

  return NextResponse.json({
    weekStart,
    assignment: {
      id: a.id,
      week_start: a.week_start,
      template_id: a.template_id,
      created_at: a.created_at,
      template: t
        ? {
            id: t.id,
            title: t.title,
            exercises: normalizeExercises(t.exercises),
          }
        : null,
    },
  });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { weekStart?: unknown; templateId?: unknown }
    | null;

  const weekStart = normalizeWeekStart(body?.weekStart);
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";

  if (!templateId) return NextResponse.json({ error: "Missing templateId" }, { status: 400 });

  const { data: template, error: tErr } = await supabaseAdmin
    .from("session_templates")
    .select("id")
    .eq("team_id", TEAM_ID)
    .eq("id", templateId)
    .single();

  if (tErr || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: assignment, error: aErr } = await supabaseAdmin
    .from("weekly_sessions")
    .upsert(
      { team_id: TEAM_ID, week_start: weekStart, template_id: templateId },
      { onConflict: "team_id,week_start" },
    )
    .select("id, week_start, template_id, created_at")
    .single();

  if (aErr) {
    return NextResponse.json({ error: aErr.message, code: aErr.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignment });
}
