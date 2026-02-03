import { supabaseAdmin } from "./supabaseAdmin";
import { mondayWeekStartISO } from "./week";

// Get required weekly sessions setting
export async function getRequiredWeeklySessions(): Promise<1 | 2 | 3 | 4> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "required_sessions_weekly")
      .single();

    if (error || !data?.value_int) {
      return 3; // Default value
    }

    const value = data.value_int;
    return (value >= 1 && value <= 4) ? (value as 1 | 2 | 3 | 4) : 3;
  } catch (error) {
    console.error("Error fetching required sessions:", error);
    return 3; // Default value
  }
}

// Calculate weekly sessions for a user
export async function calcWeeklySessions(
  userId: string, 
  startOfWeek: string, 
  endOfWeek?: string
): Promise<number> {
  try {
    const weekEnd = endOfWeek || startOfWeek + "T23:59:59.999Z";
    
    const { count, error } = await supabaseAdmin
      .from("uploads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("created_at", startOfWeek + "T00:00:00.000Z")
      .lt("created_at", weekEnd);

    if (error) {
      console.error(`Error counting sessions for user ${userId}:`, error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error(`Error calculating weekly sessions for user ${userId}:`, error);
    return 0;
  }
}

// Get users who met the weekly quota
export async function getMetUsers(
  required: number, 
  weekRange?: { start: string; end?: string }
): Promise<Array<{ id: string; name: string; weeklySessionCount: number; metQuota: boolean }>> {
  try {
    const weekStart = weekRange?.start || mondayWeekStartISO(new Date());
    
    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name");

    if (usersError) {
      throw usersError;
    }

    // Calculate weekly sessions for each user
    const usersWithSessions = await Promise.all(
      users.map(async (user) => {
        const sessionCount = await calcWeeklySessions(user.id, weekStart);
        const metQuota = sessionCount >= required;

        return {
          id: user.id,
          name: user.name,
          weeklySessionCount: sessionCount,
          metQuota
        };
      })
    );

    return usersWithSessions.filter(user => user.metQuota);
  } catch (error) {
    console.error("Error getting met users:", error);
    return [];
  }
}

// Get current week range in Europe/Dublin timezone
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const weekStart = mondayWeekStartISO(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
  weekEnd.setHours(23, 59, 59, 999);
  
  return {
    start: weekStart,
    end: weekEnd.toISOString().slice(0, 10)
  };
}
