"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import CameraCapture from "@/components/CameraCapture";
import { SecondaryButton } from "@/components/GymButtons";
import { useUploadFlow } from "@/components/UploadFlowContext";
import ToastBanner from "@/components/ToastBanner";
import PageContainer from "@/components/PageContainer";

import { useSelectedPlayer } from "@/lib/useSelectedPlayer";

type ToastState = { message: string; type: "success" | "error" };

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UploadScreen({ teamName }: { teamName: string }) {
  const router = useRouter();
  const { setDraft, clearDraft } = useUploadFlow();

  const { player } = useSelectedPlayer();
  const selectedPlayerId = player?.playerId ?? null;
  const selectedPlayerName = player?.playerName ?? null;

  const [toast, setToast] = useState<ToastState | null>(null);

  const onCapture = useCallback(
    (file: File, preview: string) => {
      if (!selectedPlayerId) return;
      clearDraft();
      setDraft({ userId: selectedPlayerId, file, previewUrl: preview });
      router.push("/upload/review");
    },
    [clearDraft, router, selectedPlayerId, setDraft],
  );

  const onRetake = useCallback(() => {}, []);

  const onUse = useCallback(() => {
  }, []);

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName} showBottomNav={false}>

      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-4 sm:pb-6 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-button">
            <Camera className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Upload</h2>
            <p className="text-xs text-muted-foreground">Prove you trained today</p>
          </div>
        </div>

        {selectedPlayerId && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="font-display font-bold text-xs text-primary-foreground">
                    {initialsFromName(selectedPlayerName || "")}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Posting as</p>
                  <p className="font-semibold text-sm text-foreground">{selectedPlayerName || ""}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={() => {
                  router.push(`/select-player?next=${encodeURIComponent("/upload")}`);
                }}
              >
                <Pencil className="w-3 h-3" />
                Change
              </SecondaryButton>
            </div>

            <CameraCapture
              onCapture={onCapture}
              preview={null}
              onRetake={onRetake}
              onUse={onUse}
              uploading={false}
              progress={0}
            />
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
