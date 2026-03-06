import React from "react";
import { Camera, Trophy, Scroll, Settings } from "lucide-react";

type MainTab = "home" | "upload" | "leaderboard" | "doomscroll" | "admin";

interface MainMenuProps {
  teamName: string;
  onNavigate: (tab: MainTab) => void;
}

const MENU_ITEMS = [
  {
    id: "upload" as MainTab,
    label: "Upload",
    description: "Post your gym proof photo to the team",
    Icon: Camera,
    accent: true,
  },
  {
    id: "leaderboard" as MainTab,
    label: "Leaderboard",
    description: "See who's putting in the most sessions",
    Icon: Trophy,
    accent: false,
  },
  {
    id: "doomscroll" as MainTab,
    label: "Doom Scroll",
    description: "Browse every session the squad has logged",
    Icon: Scroll,
    accent: false,
  },
  {
    id: "admin" as MainTab,
    label: "Admin",
    description: "Manage team settings and members",
    Icon: Settings,
    accent: false,
    disabled: false,
  },
];

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-sm mx-auto px-4 pt-5 pb-4 animate-fade-up">
      <div className="mb-6">
        <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">
          What's the move?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose an option below to get started.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {MENU_ITEMS.map(({ id, label, description, Icon, accent, disabled }, i) => (
          <button
            key={id + label}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onNavigate(id)}
            className={`
              w-full flex items-center gap-4 px-5 py-5 rounded-2xl border text-left
              transition-all duration-150 active-scale shadow-card
              animate-fade-up
              ${disabled
                ? "opacity-50 pointer-events-none bg-card border-border"
                : accent
                  ? "bg-primary border-primary hover:bg-primary/90"
                  : "bg-card border-border hover:border-foreground/20 hover:shadow-card-hover"
              }
            `}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                ${accent && !disabled ? "bg-primary-foreground/15" : "bg-secondary"}
              `}
            >
              <Icon
                className={`w-5 h-5 ${accent && !disabled ? "text-primary-foreground" : "text-foreground"}`}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-display font-bold text-[15px] leading-tight ${
                  accent && !disabled ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {label}
                {disabled && (
                  <span className="ml-2 text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground align-middle">
                    SOON
                  </span>
                )}
              </p>
              <p
                className={`text-xs mt-0.5 leading-snug ${
                  accent && !disabled ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {description}
              </p>
            </div>
            <svg
              className={`w-4 h-4 shrink-0 ${accent && !disabled ? "text-primary-foreground/60" : "text-muted-foreground/50"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MainMenu;
