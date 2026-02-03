import { supabase } from "./supabaseClient";
import { supabaseAdmin } from "./supabaseAdmin";

// Get required weekly sessions setting
export async function getRequiredWeeklySessions(): Promise<number> {
  try {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from("app_settings")
      .upsert({
        key: "required_sessions_weekly",
        value_int: value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error setting required sessions:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    console.log("Successfully updated required sessions to:", value);
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
      .upsert({
        key: "required_sessions_weekly",
        value_int: 3,
        updated_at: new Date().toISOString()
      })
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
export async function setRequiredWeeklySessionsServer(value: 1 | 2 | 3 | 4): Promise<void> {
  try {
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
      console.error("Server error setting required sessions:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    console.log("Server successfully updated required sessions to:", value);
  } catch (error) {
    console.error("Server failed to set required sessions:", error);
    throw error;
  }
}
