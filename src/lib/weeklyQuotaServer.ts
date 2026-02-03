import { supabaseAdmin } from "./supabaseAdmin";
import { mondayWeekStartISO } from "./week";

// Server-side function to get required weekly sessions
export async function getRequiredWeeklySessions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "required_sessions_weekly")
      .single();

    if (error) {
      console.error("Error fetching required sessions:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      // If row doesn't exist, create it with default value
      if (error.code === 'PGRST116') {
        console.log("Setting not found, creating with default value");
        const { data: newData, error: insertError } = await supabaseAdmin
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
          return 3; // Ultimate fallback
        }

        return newData.value_int;
      }
      
      throw error;
    }

    return data.value_int || 3;
  } catch (error) {
    console.error("Failed to get required sessions:", error);
    return 3; // Default fallback
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

// Get users with their weekly quota status
export async function getUsersWithQuotaStatus(): Promise<Array<{
  id: string;
  name: string;
  weeklySessionCount: number;
  metQuota: boolean;
}>> {
  try {
    // Get required sessions
    const requiredSessions = await getRequiredWeeklySessions();
    
    // Get current week start
    const weekStart = mondayWeekStartISO(new Date());
    
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
        const metQuota = sessionCount >= requiredSessions;

        return {
          id: user.id,
          name: user.name,
          weeklySessionCount: sessionCount,
          metQuota
        };
      })
    );

    return usersWithSessions;
  } catch (error) {
    console.error("Error getting users with quota status:", error);
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
