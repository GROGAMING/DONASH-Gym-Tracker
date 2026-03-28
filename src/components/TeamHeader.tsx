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

        <a
          href="https://www.instagram.com/repreceiptgymtracker/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-opacity hover:opacity-80 active:scale-90 transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
    </header>
  );
};

export default TeamHeader;
