export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";

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

  const originalFilename = file.name || "upload";
  const objectPath = `${TEAM_ID}/${Date.now()}-${originalFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error: upErr } = await supabaseAdmin.storage
    .from("gym-photos")
    .upload(objectPath, bytes, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: insErr } = await supabaseAdmin.from("uploads").insert({
    user_id: userId,
    image_path: objectPath,
    status: "active",
    team_id: TEAM_ID,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
