import "server-only";

/**
 * TEAM_ID is used only in:
 *   1. Admin API routes (admin auth is deployment-scoped, not player-scoped)
 *   2. Public/unauthenticated endpoints where no player context exists yet:
 *      - /api/players        (player-select screen, no player known yet)
 *      - /api/sessions       (session list, no player known yet)
 *      - /api/sessions/[id]  (session detail, weeklySessionId carries no team signal)
 *      - /api/doom-scroll    (public feed, no auth token)
 *
 * All player-facing writes and reads that receive a playerId/userId resolve
 * the current team dynamically via src/lib/resolveTeam.ts instead.
 */
export const TEAM_ID = process.env.TEAM_ID;

if (!TEAM_ID) {
  throw new Error("Missing TEAM_ID env var");
}

export const TEAM_NAME: string = process.env.TEAM_NAME || "Gym Tracker";
