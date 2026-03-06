export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeamIdForPlayer } from "@/lib/resolveTeam";

export async function POST(req: Request) {
  const formData = await req.formData();

  const userId = formData.get("userId");
  const file = formData.get("file");
  const comment = formData.get("comment");

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const currentTeamId = await getTeamIdForPlayer(userId);
  if (!currentTeamId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const originalFilename = file.name || "upload";
  const objectPath = `${currentTeamId}/${Date.now()}-${originalFilename}`;

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

  const insertBase: Record<string, unknown> = {
    user_id: userId,
    image_path: objectPath,
    status: "active",
    team_id: currentTeamId,
  };

  const insertWithComment: Record<string, unknown> = {
    ...insertBase,
    ...(typeof comment === "string" && comment.trim().length > 0 ? { comment: comment.trim() } : {}),
  };

  let insErr = (await supabaseAdmin.from("uploads").insert(insertWithComment)).error;

  // Backward-compatible fallback if the DB/schema doesn't have a comment field
  if (insErr && /column .*comment.* does not exist/i.test(insErr.message)) {
    insErr = (await supabaseAdmin.from("uploads").insert(insertBase)).error;
  }

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
