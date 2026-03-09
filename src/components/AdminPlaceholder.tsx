import React from "react";
import { Settings } from "lucide-react";

import PageContainer from "@/components/PageContainer";

interface AdminPlaceholderProps {
  onBack: () => void;
}

const AdminPlaceholder: React.FC<AdminPlaceholderProps> = (_props) => (
  <PageContainer className="pt-6 pb-2 animate-fade-up">
    <div className="flex items-center gap-3 mb-1">
      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shadow-card shrink-0">
        <Settings className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="font-display font-extrabold text-xl text-foreground leading-tight">Admin</h1>
        <p className="text-xs text-muted-foreground">Manage your team and sessions</p>
      </div>
    </div>
  </PageContainer>
);

export default AdminPlaceholder;
