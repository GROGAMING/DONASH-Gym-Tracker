"use client";

import React from "react";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSelectedPlayer } from "@/lib/useSelectedPlayer";

interface TeamHeaderProps {
  teamName: string;
}

const TeamHeader: React.FC<TeamHeaderProps> = ({ teamName }) => {
  const router = useRouter();
  const { player, hydrated } = useSelectedPlayer();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shadow-button">
          <Shield className="w-4 h-4 text-background" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground leading-none mb-0.5">Rep Receipt</span>
          <span className="font-display font-bold text-sm text-foreground leading-none truncate">{teamName}</span>
        </div>

        {hydrated && player?.playerName && (
          <button
            type="button"
            onClick={() => {
              const next =
                typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
              router.push(`/select-player?next=${encodeURIComponent(next)}`);
            }}
            className="shrink-0 text-xs font-semibold text-foreground/80 hover:text-foreground transition-colors"
            aria-label="Change player"
          >
            {player.playerName} · Change
          </button>
        )}
      </div>
    </header>
  );
};

export default TeamHeader;
