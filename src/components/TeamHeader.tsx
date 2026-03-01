import React from "react";
import { Shield } from "lucide-react";

interface TeamHeaderProps {
  teamName: string;
}

const TeamHeader: React.FC<TeamHeaderProps> = ({ teamName }) => {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-button">
          <Shield className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground leading-none mb-0.5">Rep Receipt</span>
          <span className="font-display font-bold text-sm text-foreground leading-none">
            {teamName}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TeamHeader;
