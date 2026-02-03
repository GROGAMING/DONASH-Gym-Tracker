import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("key, value_int, value_text")
      .eq("key", "required_sessions_weekly")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default value if not found
    const requiredSessions = data?.value_int || 3;

    return NextResponse.json({ 
      key: "required_sessions_weekly",
      value: requiredSessions 
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { value } = await request.json();

    if (typeof value !== 'number' || value < 1 || value > 4) {
      return NextResponse.json({ 
        error: 'Value must be between 1 and 4' 
      }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: "required_sessions_weekly",
        value_int: value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      key: "required_sessions_weekly",
      value: data.value_int,
      updated_at: data.updated_at
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
