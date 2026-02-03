import { getUsersWithQuotaStatus, getRequiredWeeklySessions, getCurrentWeekRange } from "@/lib/weeklyQuotaServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetOnly = searchParams.get("metOnly") === "true";

    // Get users with their quota status
    const users = await getUsersWithQuotaStatus();
    
    // Get the actual required sessions value
    const requiredSessions = await getRequiredWeeklySessions();
    
    // Get current week range
    const weekRange = getCurrentWeekRange();
    
    // Filter by met quota if requested
    const filteredUsers = includeMetOnly 
      ? users.filter(user => user.metQuota)
      : users;
    
    // Sort by name
    filteredUsers.sort((a, b) => a.name.localeCompare(b.name));

    const metCount = users.filter(u => u.metQuota).length;

    return NextResponse.json({
      users: filteredUsers,
      requiredSessions,
      weekStart: weekRange.start,
      totalUsers: users.length,
      metCount
    });
  } catch (error) {
    console.error('Error fetching weekly quota data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
