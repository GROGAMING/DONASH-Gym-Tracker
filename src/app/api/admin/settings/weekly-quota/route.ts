import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types"; // adjust if your types live elsewhere
import type { CookieOptions } from "@supabase/ssr";

const KEY = "required_sessions_weekly";

function asRequired(n: unknown): 1 | 2 | 3 | 4 | null {
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null;
}

function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Route handlers can set cookies; this keeps auth sessions working
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("app_settings")
    .select("value_int")
    .eq("key", KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 }
    );
  }

  const requiredRaw = data?.value_int ?? 3;
  const required = asRequired(requiredRaw) ?? 3;

  return NextResponse.json({ required });
}

export async function PUT(req: Request) {
  const supabase = supabaseServer();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = asRequired(body?.required);
  if (!required) {
    return NextResponse.json({ error: "required must be 1, 2, 3, or 4" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY, value_int: required }, { onConflict: "key" });

  if (error) {
    // very commonly RLS/auth -> surface details for debugging
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, required });
}
