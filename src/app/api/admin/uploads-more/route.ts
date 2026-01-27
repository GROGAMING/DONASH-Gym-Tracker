import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = before ? 50 : 50; // always 50

  let query = supabaseAdmin
    .from("uploads")
    .select("id, created_at, image_path, status, users(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const items = (data ?? []).map((row: any) => {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("gym-photos")
      .getPublicUrl(row.image_path);
    return {
      id: row.id,
      name: row.users?.name ?? "Unknown",
      created_at: row.created_at,
      image_path: row.image_path,
      publicUrl
    };
  });

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
