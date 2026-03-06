"use client";

import { useEffect, useMemo, useState } from "react";

import {
  clearSelectedPlayer,
  getSelectedPlayer,
  onSelectedPlayerChange,
  setSelectedPlayer,
  type SelectedPlayer,
} from "@/lib/playerSession";

export function useSelectedPlayer() {
  const [player, setPlayer] = useState<SelectedPlayer | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPlayer(getSelectedPlayer());
    setHydrated(true);

    return onSelectedPlayerChange(() => {
      setPlayer(getSelectedPlayer());
    });
  }, []);

  return useMemo(
    () => ({
      hydrated,
      player,
      setPlayer: (p: SelectedPlayer) => setSelectedPlayer(p),
      clearPlayer: () => clearSelectedPlayer(),
    }),
    [hydrated, player],
  );
}
