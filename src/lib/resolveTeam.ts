import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Resolves the team_id for a given player (user) id by reading users.team_id.
 * This is the correct multi-tenant resolution path for all player-facing API routes:
 * the team a request belongs to is determined by who the player is, not by env var.
 *
 * Returns the team_id string, or null if the player is not found or has no team.
 */
export async function getTeamIdForPlayer(playerId: string): Promise<string | null> {
  if (!playerId) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("team_id")
    .eq("id", playerId)
    .maybeSingle();

  if (error || !data) return null;

  const teamId = (data as { team_id: string | null }).team_id;
  return typeof teamId === "string" && teamId.length > 0 ? teamId : null;
}
