import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Helper to check admin authentication
function isAdmin(): boolean {
  return cookies().get("admin_authed")?.value === "1";
}

// Create server-side Supabase client with RLS
function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function GET() {
  try {
    // Check admin authentication
    if (!isAdmin()) {
      return NextResponse.json({ 
        error: 'Unauthorized - admin access required' 
      }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from("app_settings")
      .select("value_int")
      .eq("key", "required_sessions_weekly")
      .single();

    if (error) {
      console.error("Error fetching weekly quota setting:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      // If row doesn't exist, create it with default value
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
            details: insertError.message 
          }, { status: 500 });
        }

        return NextResponse.json({ required: newData.value_int });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch setting',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ required: data.value_int });
  } catch (error) {
    console.error('Server error in weekly quota GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    if (!isAdmin()) {
      return NextResponse.json({ 
        error: 'Unauthorized - admin access required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { required } = body;

    // Validate input
    if (typeof required !== 'number' || required < 1 || required > 4) {
      return NextResponse.json({ 
        error: 'Required sessions must be between 1 and 4' 
      }, { status: 400 });
    }

    const supabase = createServerClient();
    
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
      console.error("Error updating weekly quota setting:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      return NextResponse.json({ 
        error: 'Failed to update setting',
        details: error.message 
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
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
