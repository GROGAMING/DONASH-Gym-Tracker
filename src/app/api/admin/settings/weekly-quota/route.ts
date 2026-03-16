import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequiredWeeklySessionsServer, setRequiredWeeklySessionsServer } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdmin(): boolean {
  return cookies().get("admin_authed")?.value === "1";
}

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const required = await getRequiredWeeklySessionsServer();
    return NextResponse.json({ required });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch quota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>)?.required;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1 || raw > 10) {
    return NextResponse.json({ error: "required must be a number between 1 and 10" }, { status: 400 });
  }

  const value = Math.floor(raw) as 1 | 2 | 3 | 4;

  try {
    await setRequiredWeeklySessionsServer(value);
    return NextResponse.json({ required: value });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save quota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
