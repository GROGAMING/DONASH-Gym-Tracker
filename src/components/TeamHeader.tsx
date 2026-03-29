"use client";

import React from "react";
import Image from "next/image";
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
      <div className="flex items-center justify-between gap-3 px-4 py-1.5">
        <Image
          src="/rep-receipt-logo.png"
          alt="Rep Receipt"
          width={120}
          height={32}
          className="shrink-0 object-contain max-w-[120px] h-auto"
          priority
        />

        <div className="flex items-center gap-3 ml-auto">
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
      </div>
    </header>
  );
};

export default TeamHeader;
