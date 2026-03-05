import React, { useState } from "react";
import { Trophy, Medal } from "lucide-react";

import PageContainer from "@/components/PageContainer";

interface LeaderEntry {
  rank: number;
  name: string;
  initials: string;
  count: number;
}

const WEEKLY_DATA: LeaderEntry[] = [
  { rank: 1, name: "Marcus Ryan",     initials: "MR", count: 5 },
  { rank: 2, name: "Cian Murphy",     initials: "CM", count: 4 },
  { rank: 3, name: "Ben Thornton",    initials: "BT", count: 4 },
  { rank: 4, name: "Eoin Kelly",      initials: "EK", count: 3 },
  { rank: 5, name: "Jack Quinlan",    initials: "JQ", count: 3 },
  { rank: 6, name: "Aaron Walsh",     initials: "AW", count: 2 },
  { rank: 7, name: "Fionn Reilly",    initials: "FR", count: 2 },
  { rank: 8, name: "Liam Brady",      initials: "LB", count: 2 },
  { rank: 9, name: "Niall Connell",   initials: "NC", count: 1 },
  { rank: 10, name: "Dara O'Brien",   initials: "DO", count: 1 },
  { rank: 11, name: "Owen Sheridan",  initials: "OS", count: 1 },
  { rank: 12, name: "Hugh McMahon",   initials: "HM", count: 0 },
  { rank: 13, name: "Ian Farrell",    initials: "IF", count: 0 },
  { rank: 14, name: "Gavin Clarke",   initials: "GC", count: 0 },
  { rank: 15, name: "Kevin O'Shea",   initials: "KO", count: 0 },
];

const ALLTIME_DATA: LeaderEntry[] = [
  { rank: 1, name: "Cian Murphy",     initials: "CM", count: 47 },
  { rank: 2, name: "Marcus Ryan",     initials: "MR", count: 43 },
  { rank: 3, name: "Aaron Walsh",     initials: "AW", count: 38 },
  { rank: 4, name: "Ben Thornton",    initials: "BT", count: 34 },
  { rank: 5, name: "Jack Quinlan",    initials: "JQ", count: 29 },
  { rank: 6, name: "Eoin Kelly",      initials: "EK", count: 27 },
  { rank: 7, name: "Fionn Reilly",    initials: "FR", count: 22 },
  { rank: 8, name: "Liam Brady",      initials: "LB", count: 19 },
  { rank: 9, name: "Dara O'Brien",    initials: "DO", count: 18 },
  { rank: 10, name: "Niall Connell",  initials: "NC", count: 15 },
  { rank: 11, name: "Owen Sheridan",  initials: "OS", count: 12 },
  { rank: 12, name: "Gavin Clarke",   initials: "GC", count: 10 },
  { rank: 13, name: "Hugh McMahon",   initials: "HM", count: 8 },
  { rank: 14, name: "Ian Farrell",    initials: "IF", count: 6 },
  { rank: 15, name: "Kevin O'Shea",   initials: "KO", count: 4 },
];

const RANK_STYLES: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-400 text-white",
  },
  2: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    badge: "bg-slate-400 text-white",
  },
  3: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    badge: "bg-orange-400 text-white",
  },
};

const rankLabel = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
};

const LeaderRow: React.FC<{ entry: LeaderEntry; isTop: boolean }> = ({ entry, isTop }) => {
  const style = isTop ? RANK_STYLES[entry.rank] : null;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
        ${isTop
          ? `${style!.bg} ${style!.border} shadow-card`
          : "bg-card border-border"
        }
      `}
    >
      {/* Rank badge */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
        font-display font-bold text-sm
        ${isTop ? `${style!.badge}` : "bg-muted text-muted-foreground"}
      `}>
        {rankLabel(entry.rank)}
      </div>

      {/* Avatar */}
      <div className={`
        w-9 h-9 rounded-full flex items-center justify-center shrink-0
        ${isTop ? "bg-primary" : "bg-secondary"}
      `}>
        <span className={`font-display font-bold text-xs ${isTop ? "text-primary-foreground" : "text-foreground"}`}>
          {entry.initials}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isTop ? style!.text : "text-foreground"}`}>
          {entry.name}
        </p>
      </div>

      {/* Count */}
      <div className="text-right shrink-0">
        <span className={`font-display font-bold text-base ${isTop ? style!.text : "text-foreground"}`}>
          {entry.count}
        </span>
        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">sessions</p>
      </div>
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const [tab, setTab] = useState<"weekly" | "alltime">("weekly");
  const data = tab === "weekly" ? WEEKLY_DATA : ALLTIME_DATA;

  return (
    <PageContainer className="pt-5 sm:pt-6 pb-4 sm:pb-6 animate-fade-up">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-button">
          <Trophy className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Leaderboard</h2>
          {tab === "weekly" && (
            <p className="text-xs text-muted-foreground">Week of Feb 16 – Feb 22</p>
          )}
          {tab === "alltime" && (
            <p className="text-xs text-muted-foreground">All-time sessions</p>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-secondary rounded-xl p-1 mb-5">
        {(["weekly", "alltime"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
              ${tab === t
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {t === "weekly" ? "Weekly" : "All-time"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {data.map((entry) => (
          <LeaderRow
            key={entry.name}
            entry={entry}
            isTop={entry.rank <= 3}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Medal className="w-3.5 h-3.5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground/60">
            {data.length} athletes ranked
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default Leaderboard;
