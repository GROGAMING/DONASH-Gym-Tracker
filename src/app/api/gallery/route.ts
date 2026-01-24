export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("uploads")
    .select("id, user_id, created_at, image_path")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  // Fetch user names
  const userIds = [...new Set((data ?? []).map((u: any) => u.user_id))];
  const { data: users, error: usersErr } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .in("id", userIds);

  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const userMap = new Map((users ?? []).map((u: any) => [u.id, u.name]));

  // Generate signed URLs
  const items = await Promise.all(
    (data ?? []).map(async (row: any) => {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("gym-photos")
        .createSignedUrl(row.image_path, 600);
      const signedUrl = signed?.signedUrl ?? "";

      return {
        id: row.id,
        name: userMap.get(row.user_id) ?? "Unknown",
        created_at: row.created_at,
        signedUrl: signErr ? null : signedUrl
      };
    })
  );

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
