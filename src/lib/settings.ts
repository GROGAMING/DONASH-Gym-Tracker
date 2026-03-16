import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import { TEAM_ID } from "./team";

// Get required weekly sessions setting
export async function getRequiredWeeklySessions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("team_id", TEAM_ID)
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
        return await createDefaultSetting();
      }
      
      throw error;
    }

    return data.value_int || 3;
  } catch (error) {
    console.error("Failed to get required sessions:", error);
    return 3; // Default fallback
  }
}

// Set required weekly sessions setting (admin only)
export async function setRequiredWeeklySessions(value: 1 | 2 | 3 | 4): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          team_id: TEAM_ID,
          key: "required_sessions_weekly",
          value_int: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,key" },
      );

    if (error) {
      console.error("Error setting required sessions:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    console.log("Successfully updated required sessions to:", value, "for team:", TEAM_ID);
  } catch (error) {
    console.error("Failed to set required sessions:", error);
    throw error;
  }
}

// Create default setting (server-side fallback)
async function createDefaultSetting(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          team_id: TEAM_ID,
          key: "required_sessions_weekly",
          value_int: 3,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,key" },
      )
      .select("value_int")
      .single();

    if (error) {
      console.error("Error creating default setting:", error);
      throw error;
    }

    return data.value_int;
  } catch (error) {
    console.error("Failed to create default setting:", error);
    return 3; // Ultimate fallback
  }
}

// Server-side version for API routes (uses admin client)
export async function getRequiredWeeklySessionsServer(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("team_id", TEAM_ID)
      .eq("key", "required_sessions_weekly")
      .single();

    if (error) {
      console.error("Server error fetching required sessions:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      if (error.code === 'PGRST116') {
        return await createDefaultSetting();
      }
      
      throw error;
    }

    return data.value_int || 3;
  } catch (error) {
    console.error("Server failed to get required sessions:", error);
    return 3;
  }
}

// Server-side version for setting (uses admin client)
export async function setRequiredWeeklySessionsServer(value: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      {
        team_id: TEAM_ID,
        key: "required_sessions_weekly",
        value_int: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,key" },
    );

  if (error) {
    throw new Error(error.message);
  }
}
