import React from "react";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, label = "Back" }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors active-scale"
  >
    <ArrowLeft className="w-4 h-4" />
    {label}
  </button>
);

export default BackButton;
