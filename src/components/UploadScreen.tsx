"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import CameraCapture from "@/components/CameraCapture";
import PlayerSelect from "@/components/PlayerSelect";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import ToastBanner from "@/components/ToastBanner";

type Player = { id: string; name: string };

type ToastState = { message: string; type: "success" | "error" };

type UploadStep = "select" | "capture" | "captured" | "posting";

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

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayer = useMemo(() => {
    return players.find((p: Player) => p.id === selectedPlayerId) ?? null;
  }, [players, selectedPlayerId]);

  const [step, setStep] = useState<UploadStep>("select");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [toast, setToast] = useState<ToastState | null>(null);
  const progressTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  const onCapture = useCallback((file: File, preview: string) => {
    setCapturedFile(file);
    setCapturedPreview(preview);
    setStep("captured");
  }, []);

  const onRetake = useCallback(() => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedFile(null);
    setCapturedPreview(null);
    setCaption("");
    setProgress(0);
    setUploading(false);
    setStep("capture");
  }, [capturedPreview]);

  const onUse = useCallback(() => {
    setStep("captured");
  }, []);

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));

        const { width, height } = img;
        const longest = Math.max(width, height);
        const scale = longest > 600 ? 600 / longest : 1;
        canvas.width = width * scale;
        canvas.height = height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            const compressed = new File([blob], file.name || "capture.jpg", { type: "image/jpeg" });
            resolve(compressed);
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  }

  const handlePost = useCallback(async () => {
    if (!selectedPlayerId || !capturedFile || uploading) return;

    setToast(null);
    setUploading(true);
    setStep("posting");
    setProgress(10);

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((p: number) => {
        if (p >= 90) return p;
        return Math.min(p + 7, 90);
      });
    }, 180);

    try {
      const fileToUpload = await compressImage(capturedFile).catch(() => capturedFile);

      const formData = new FormData();
      formData.set("userId", selectedPlayerId);
      formData.set("file", fileToUpload);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ message: body?.error || "Upload failed.", type: "error" });
        return;
      }

      setProgress(100);
      setToast({ message: "Posted to team!", type: "success" });

      // Reset UI and go to leaderboard (existing behavior)
      setCapturedFile(null);
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
      setCaption("");
      setStep("capture");
      router.push("/leaderboard");
    } finally {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setUploading(false);
      setProgress(0);
    }
  }, [capturedFile, capturedPreview, router, selectedPlayerId, uploading]);

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="max-w-sm mx-auto px-4 pt-5 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        {!selectedPlayer && (
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-up">
            <h2 className="font-display font-bold text-xl text-foreground mb-1">Who are you?</h2>
            <p className="text-sm text-muted-foreground mb-6">Pick your name to get started.</p>

            <PlayerSelect
              players={players.map((p: Player) => p.name)}
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
              preview={step === "captured" || step === "posting" ? capturedPreview : null}
              onRetake={onRetake}
              onUse={onUse}
              uploading={uploading}
              progress={Math.min(progress, 100)}
            />

            {step === "captured" && !uploading && (
              <div className="mt-4 animate-fade-up">
                <textarea
                  value={caption}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
                  placeholder="Add a caption… (optional)"
                  maxLength={200}
                  rows={2}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-foreground/30 transition-colors"
                />
                {caption.length > 0 && (
                  <p className="text-right text-xs text-muted-foreground mt-1">{caption.length}/200</p>
                )}
                <div className="mt-4">
                  <PrimaryButton onClick={handlePost}>Post to team</PrimaryButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
