import React from "react";
import { Home, Camera, Trophy, Scroll, ClipboardList } from "lucide-react";

export type Tab = "home" | "upload" | "sessions" | "leaderboard" | "doomscroll" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "home",        label: "Home",       Icon: ({ className }) => <Home   className={className} /> },
  { id: "upload",      label: "Upload",     Icon: ({ className }) => <Camera className={className} /> },
  { id: "sessions",    label: "Sessions",   Icon: ({ className }) => <ClipboardList className={className} /> },
  { id: "leaderboard", label: "Rankings",   Icon: ({ className }) => <Trophy className={className} /> },
  { id: "doomscroll",  label: "Doom Scroll", Icon: ({ className }) => <Scroll className={className} /> },
];

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom">
    <div className="flex items-stretch max-w-screen-sm mx-auto px-2 sm:px-4">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-1 py-3
              transition-all duration-150 active-scale relative
              ${isActive ? "text-foreground" : "text-muted-foreground"}
            `}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-secondary" : ""}`}>
              <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-[9px] font-semibold tracking-wide transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {isActive && (
              <div className="absolute bottom-0 w-6 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
