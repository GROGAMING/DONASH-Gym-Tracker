import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Helper to check admin authentication
function isAdmin(): boolean {
  return cookies().get("admin_authed")?.value === "1";
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

    // Create Supabase client with cookies for RLS
    const supabase = createRouteHandlerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );

    // Get required sessions setting
    const { data, error } = await supabase
      .from("app_settings")
      .select("value_int")
      .eq("key", "required_sessions_weekly")
      .single();

    if (error) {
      console.error("Error fetching required sessions:", error);
      
      // If setting doesn't exist, create default
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from("app_settings")
          .upsert({
            key: "required_sessions_weekly",
            value_int: 3,
            updated_at: new Date().toISOString()
          })
          .select("value_int")
          .single();

        if (insertError) {
          console.error("Error creating default setting:", insertError);
          return NextResponse.json({ 
            error: 'Failed to create default setting',
            code: 'DB_ERROR'
          }, { status: 500 });
        }

        return NextResponse.json({ required: newData.value_int });
      }
      
      return NextResponse.json({ 
        error: error.message || 'Failed to fetch setting',
        code: error.code || 'UNKNOWN'
      }, { status: 500 });
    }

    // Ensure value is within valid range
    const value = data.value_int;
    const clampedValue = Math.max(1, Math.min(4, value || 3));

    return NextResponse.json({ required: clampedValue });
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

    // Create Supabase client with cookies for RLS
    const supabase = createRouteHandlerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );
    
    // Update setting
    const { data, error } = await supabase
      .from("app_settings")
      .upsert({
        key: "required_sessions_weekly",
        value_int: required,
        updated_at: new Date().toISOString()
      })
      .select("value_int, updated_at")
      .single();

    if (error) {
      console.error("Error updating weekly quota setting:", error);
      return NextResponse.json({ 
        error: error.message || 'Failed to update setting',
        code: error.code || 'UNKNOWN'
      }, { status: 500 });
    }

    console.log("Successfully updated weekly quota to:", required);
    
    return NextResponse.json({ 
      ok: true,
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
