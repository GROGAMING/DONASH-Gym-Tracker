import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TEAM_ID } from "@/lib/team";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = 10;

  // Enforce max 40 items total
  if (before) {
    const existingCount = parseInt(searchParams.get("existingCount") || "0", 10);
    if (existingCount >= 30) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
  }

  const run = async (select: string) => {
    let q = supabaseAdmin
      .from("uploads")
      .select(select)
      .eq("team_id", TEAM_ID)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    return await q;
  };

  let { data, error } = await run("id, created_at, image_path, status, comment, users(name)");

  // Backward-compatible fallback if DB doesn't have comment field
  if (error && /column .*comment.* does not exist/i.test(error.message)) {
    ({ data, error } = await run("id, created_at, image_path, status, users(name)"));
  }

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const rows = data ?? [];

  // Signed URLs so bucket can be private
  const signed = await Promise.all(
    rows.map(async (row: any) => {
      const { data: signedData, error: signedErr } =
        await supabaseAdmin.storage.from("gym-photos").createSignedUrl(row.image_path, 60 * 30); // 30 mins

      return {
        id: row.id,
        name: row.users?.name ?? "Unknown",
        created_at: row.created_at,
        image_path: row.image_path,
        comment: typeof row.comment === "string" ? row.comment : null,
        url: signedErr ? null : signedData?.signedUrl ?? null,
      };
    })
  );

  return new Response(JSON.stringify(signed), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
