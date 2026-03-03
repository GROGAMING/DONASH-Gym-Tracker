"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type UploadDraft = {
  userId: string;
  file: File;
  previewUrl: string;
};

type UploadFlowState = {
  draft: UploadDraft | null;
  setDraft: (draft: UploadDraft | null) => void;
  clearDraft: () => void;
};

const UploadFlowContext = createContext<UploadFlowState | null>(null);

export function UploadFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<UploadDraft | null>(null);

  const setDraft = useCallback((next: UploadDraft | null) => {
    setDraftState((prev) => {
      if (prev?.previewUrl && prev.previewUrl !== next?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    setDraftState((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ draft, setDraft, clearDraft }), [draft, setDraft, clearDraft]);

  return <UploadFlowContext.Provider value={value}>{children}</UploadFlowContext.Provider>;
}

export function useUploadFlow() {
  const ctx = useContext(UploadFlowContext);
  if (!ctx) throw new Error("useUploadFlow must be used within UploadFlowProvider");
  return ctx;
}
