import React from "react";
import { Settings, ArrowLeft } from "lucide-react";

interface AdminPlaceholderProps {
  onBack: () => void;
}

const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({ onBack }) => (
  <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col items-center justify-center min-h-[60vh] animate-fade-up">
    <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6 shadow-card">
      <Settings className="w-9 h-9 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <h2 className="font-display font-extrabold text-2xl text-foreground mb-2 text-center">
      Admin
    </h2>
    <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[220px]">
      Admin coming soon. Team management features are on the way.
    </p>
    <button
      type="button"
      onClick={onBack}
      className="
        mt-8 flex items-center gap-2
        text-sm font-medium text-muted-foreground
        hover:text-foreground transition-colors active-scale
      "
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Home
    </button>
  </div>
);

export default AdminPlaceholder;
