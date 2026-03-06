import "server-only";

export const TEAM_ID = process.env.TEAM_ID;

if (!TEAM_ID) {
  throw new Error("Missing TEAM_ID env var");
}

export const TEAM_NAME: string = process.env.TEAM_NAME || "Gym Tracker";
