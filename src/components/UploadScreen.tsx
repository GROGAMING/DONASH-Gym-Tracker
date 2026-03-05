"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import CameraCapture from "@/components/CameraCapture";
import PlayerSelect from "@/components/PlayerSelect";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import { useUploadFlow } from "@/components/UploadFlowContext";
import ToastBanner from "@/components/ToastBanner";
import PageContainer from "@/components/PageContainer";

type Player = { id: string; name: string };

type ToastState = { message: string; type: "success" | "error" };

type UploadStep = "select" | "capture";

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

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const playerNames = useMemo(() => players.map((p: Player) => p.name), [players]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayer = useMemo(() => {
    return players.find((p: Player) => p.id === selectedPlayerId) ?? null;
  }, [players, selectedPlayerId]);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [step, setStep] = useState<UploadStep>("select");

  useEffect(() => {
    (async () => {
      setLoadingPlayers(true);
      try {
        const res = await fetch("/api/players");
        if (!res.ok) {
          setToast({ message: "Failed to load players.", type: "error" });
          return;
        }
        const data = (await res.json()) as Player[];
        setPlayers(data);
      } catch {
        setToast({ message: "Failed to load players.", type: "error" });
      } finally {
        setLoadingPlayers(false);
      }
    })();
  }, []);

  const onCapture = useCallback(
    (file: File, preview: string) => {
      if (!selectedPlayerId) return;
      clearDraft();
      setDraft({ userId: selectedPlayerId, file, previewUrl: preview });
      router.push("/upload/review");
    },
    [clearDraft, router, selectedPlayerId, setDraft],
  );

  const onRetake = useCallback(() => {
    setStep("capture");
  }, []);

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

        {!selectedPlayer && (
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-up">
            <h2 className="font-display font-bold text-xl text-foreground mb-1">Who are you?</h2>
            <p className="text-sm text-muted-foreground mb-6">Pick your name to get started.</p>

            <PlayerSelect
              players={playerNames}
              selected={null}
              onSelect={(name: string) => {
                const p = players.find((x: Player) => x.name === name);
                if (p) {
                  setSelectedPlayerId(p.id);
                  setStep("capture");
                }
              }}
            />

            <div className="mt-5">
              <PrimaryButton disabled={!selectedPlayerId || loadingPlayers} onClick={() => setStep("capture")}>Continue →</PrimaryButton>
            </div>
          </div>
        )}

        {selectedPlayer && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="font-display font-bold text-xs text-primary-foreground">{initialsFromName(selectedPlayer.name)}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Posting as</p>
                  <p className="font-semibold text-sm text-foreground">{selectedPlayer.name}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={() => {
                  setSelectedPlayerId(null);
                  setStep("select");
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
