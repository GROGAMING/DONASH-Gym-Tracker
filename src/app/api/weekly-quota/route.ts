import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mondayWeekStartISO } from "@/lib/week";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetOnly = searchParams.get("metOnly") === "true";

    // Get current week start
    const weekStart = mondayWeekStartISO(new Date());
    
    // Get all users
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

        return {
          id: user.id,
          name: user.name,
          weeklySessionCount: count || 0
        };
      })
    );

    // Filter out null results
    const validUsers = usersWithSessions.filter(user => user !== null);
    
    // Sort by name
    validUsers.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      users: validUsers,
      requiredSessions: 3, // Default value - will be overridden by client-side localStorage
      weekStart,
      totalUsers: validUsers.length,
      metCount: validUsers.filter(u => u.weeklySessionCount >= 3).length
    });
  } catch (error) {
    console.error('Error fetching weekly quota data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
