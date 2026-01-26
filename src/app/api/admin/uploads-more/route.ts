import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  if (!before) {
    return new Response(JSON.stringify({ error: "Missing before parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const { data, error } = await supabaseAdmin
    .from("uploads")
    .select("id, created_at, image_path, status, users(name)")
    .eq("status", "active")
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(50);

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
