import { NextRequest, NextResponse } from "next/server";
import { getRequiredWeeklySessions } from "@/lib/weeklyQuotaServer";
import { cookies } from "next/headers";

// Helper to check admin authentication
function isAdmin(): boolean {
  return cookies().get("admin_authed")?.value === "1";
}

// Create server-side Supabase client with RLS using cookies
function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          cookie: cookies().toString()
        }
      }
    }
  );
}

export async function GET() {
  try {
    // Check admin authentication
    if (!isAdmin()) {
      return NextResponse.json({ 
        error: 'Unauthorized - admin access required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const requiredSessions = await getRequiredWeeklySessions();

    return NextResponse.json({ required: requiredSessions });
  } catch (error) {
    console.error('Server error in weekly quota GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    if (!isAdmin()) {
      return NextResponse.json({ 
        error: 'Unauthorized - admin access required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const body = await request.json();
    const { required } = body;

    // Validate input
    if (typeof required !== 'number' || required < 1 || required > 4) {
      return NextResponse.json({ 
        error: 'Required sessions must be between 1 and 4',
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    // Update using the centralized function
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: "required_sessions_weekly",
        value_int: required,
        updated_at: new Date().toISOString()
      })
      .select("value_int, updated_at")
      .single();

    if (error) {
      console.error("Error updating weekly quota setting:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      return NextResponse.json({ 
        error: error.message || 'Failed to update setting',
        code: error.code || 'UNKNOWN',
        details: error.details || null
      }, { status: 500 });
    }

    console.log("Successfully updated weekly quota to:", required);
    
    return NextResponse.json({ 
      required: data.value_int,
      updated_at: data.updated_at
    });
  } catch (error) {
    console.error('Server error in weekly quota PUT:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
