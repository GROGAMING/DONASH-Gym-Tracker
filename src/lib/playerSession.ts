export type SelectedPlayer = {
  playerId: string;
  playerName?: string;
};

const STORAGE_KEY = "selectedPlayer";
const EVENT_NAME = "player-session-changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getSelectedPlayer(): SelectedPlayer | null {
  if (!canUseStorage()) return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SelectedPlayer> | null;
    if (!parsed || typeof parsed.playerId !== "string" || parsed.playerId.trim().length === 0) return null;
    const playerName = typeof parsed.playerName === "string" ? parsed.playerName : undefined;
    return { playerId: parsed.playerId, playerName };
  } catch {
    return null;
  }
}

export function setSelectedPlayer(next: SelectedPlayer) {
  if (!canUseStorage()) return;

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      playerId: next.playerId,
      playerName: typeof next.playerName === "string" ? next.playerName : undefined,
    }),
  );

  window.dispatchEvent(new Event(EVENT_NAME));
}

export function clearSelectedPlayer() {
  if (!canUseStorage()) return;

  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onSelectedPlayerChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => cb();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
