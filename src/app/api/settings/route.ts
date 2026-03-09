import { NextRequest, NextResponse } from "next/server";
import { getRequiredWeeklySessionsServer, setRequiredWeeklySessionsServer } from "@/lib/settings";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to check admin authentication
function isAdmin(): boolean {
  return cookies().get("admin_authed")?.value === "1";
}

export async function GET() {
  try {
    const requiredSessions = await getRequiredWeeklySessionsServer();

    return NextResponse.json({ 
      key: "required_sessions_weekly",
      value: requiredSessions 
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
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

    const { value } = await request.json();

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10) {
      return NextResponse.json({ 
        error: 'Value must be between 1 and 10' 
      }, { status: 400 });
    }

    const n = Math.floor(value);
    await setRequiredWeeklySessionsServer(n as 1 | 2 | 3 | 4);

    return NextResponse.json({ 
      key: "required_sessions_weekly",
      value: n,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error updating settings:', error);
    }
    return NextResponse.json({ 
      error: msg || 'Failed to update settings',
    }, { status: 500 });
  }
}
