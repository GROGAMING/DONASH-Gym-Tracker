export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { mondayWeekStartISO } from "@/lib/week";

export async function POST(req: Request) {
  const formData = await req.formData();

  const userId = formData.get("userId");
  const file = formData.get("file");

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const weekStart = mondayWeekStartISO(new Date());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

  const originalPathOrFilename = `${weekStart}/${userId}/${randomUUID()}.${ext}`;
  const imagePath = `${TEAM_ID}/${originalPathOrFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error: upErr } = await supabaseAdmin.storage
    .from("gym-photos")
    .upload(imagePath, bytes, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: insErr } = await supabaseAdmin.from("uploads").insert({
    user_id: userId,
    image_path: imagePath,
    status: "active",
    team_id: TEAM_ID,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
