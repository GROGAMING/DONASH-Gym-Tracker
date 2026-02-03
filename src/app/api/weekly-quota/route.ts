import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mondayWeekStartISO } from "@/lib/week";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetOnly = searchParams.get("metOnly") === "true";

    // Get current week start (Monday in Europe/Dublin)
    const weekStart = mondayWeekStartISO(new Date());
    
    // Get required sessions setting
    const { data: settingData } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "required_sessions_weekly")
      .single();
    
    const requiredSessions = settingData?.value_int || 3;

    // Get all users with their weekly session counts
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name");

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Get weekly session counts for each user
    const usersWithSessions = await Promise.all(
      users.map(async (user) => {
        const { count, error: countError } = await supabaseAdmin
          .from("uploads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active")
          .gte("created_at", weekStart + "T00:00:00.000Z")
          .lt("created_at", weekStart + "T23:59:59.999Z");

        if (countError) {
          console.error(`Error counting sessions for user ${user.id}:`, countError);
          return null;
        }

        const sessionCount = count || 0;
        const metQuota = sessionCount >= requiredSessions;

        return {
          id: user.id,
          name: user.name,
          weeklySessionCount: sessionCount,
          metQuota: metQuota
        };
      })
    );

    // Filter out null results and optionally filter by met quota
    let filteredUsers = usersWithSessions.filter(user => user !== null);
    
    if (includeMetOnly) {
      filteredUsers = filteredUsers.filter(user => user!.metQuota);
    }

    // Sort by name
    filteredUsers.sort((a, b) => a!.name.localeCompare(b!.name));

    return NextResponse.json({
      users: filteredUsers,
      requiredSessions,
      weekStart,
      totalUsers: users.length,
      metCount: filteredUsers.filter(u => u!.metQuota).length
    });
  } catch (error) {
    console.error('Error fetching weekly quota data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
