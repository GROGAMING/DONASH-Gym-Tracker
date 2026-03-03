"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, RefreshCcw, Send, AlertCircle } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import { Textarea } from "@/components/ui/textarea";
import { useUploadFlow } from "@/components/UploadFlowContext";

type ToastState = { message: string; type: "success" | "error" };

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
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
          URL.revokeObjectURL(objectUrl);
          resolve(compressed);
        },
        "image/jpeg",
        0.7,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

export default function UploadReviewScreen({ teamName }: { teamName: string }) {
  const router = useRouter();
  const { draft, clearDraft } = useUploadFlow();

  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  const onBack = useCallback(() => {
    router.push("/upload");
  }, [router]);

  const onRetake = useCallback(() => {
    clearDraft();
    router.push("/upload");
  }, [clearDraft, router]);

  const onPost = useCallback(async () => {
    if (!draft || uploading) return;

    setToast(null);
    setError(null);
    setUploading(true);
    setProgress(10);

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return Math.min(p + 7, 90);
      });
    }, 180);

    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

      const fileToUpload = await compressImage(draft.file).catch(() => draft.file);

      const formData = new FormData();
      formData.set("userId", draft.userId);
      formData.set("file", fileToUpload);
      if (comment.trim().length > 0) {
        formData.set("comment", comment.trim());
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Upload failed.");
      }

      setProgress(100);
      setToast({ message: "Posted to team!", type: "success" });

      window.setTimeout(() => {
        clearDraft();
        router.push("/doom-scroll");
      }, 350);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setToast({ message: "Upload failed.", type: "error" });
    } finally {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setUploading(false);
      setProgress(0);
    }
  }, [clearDraft, comment, draft, router, uploading]);

  if (!draft) {
    return (
      <AppShell teamName={teamName} showBottomNav={false}>
        <div className="max-w-sm mx-auto px-4 pt-5 pb-4 animate-fade-up">
          <div className="mb-4">
            <BackButton onClick={onBack} />
          </div>

          <div className="bg-card rounded-2xl shadow-card border border-border p-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-foreground" />
            </div>
            <h2 className="font-display font-bold text-xl text-foreground mb-1">Session expired</h2>
            <p className="text-sm text-muted-foreground mb-5">Please retake your photo to post it.</p>
            <PrimaryButton onClick={() => router.push("/upload")}>Retake photo</PrimaryButton>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell teamName={teamName} showBottomNav={false}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="max-w-sm mx-auto px-4 pt-5 pb-28 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} label="Back" />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-button">
            <Send className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Review &amp; Post</h2>
            <p className="text-xs text-muted-foreground">Make sure it's a banger</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card animate-fade-up">
          <div className="relative w-full" style={{ paddingBottom: "75%" }}>
            <img
              src={draft.previewUrl}
              alt="Captured gym photo"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-foreground/70 backdrop-blur-sm text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" />
              Ready
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">Add a comment (optional)</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How'd it go?"
            maxLength={120}
            rows={3}
            className="bg-card"
            disabled={uploading}
          />
          <p className="text-right text-xs text-muted-foreground mt-1">{comment.length}/120</p>
        </div>

        {error && (
          <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-destructive">{error}</p>
          </div>
        )}

        {uploading && (
          <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-card animate-fade-up">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Posting…</span>
              <span className="text-sm font-semibold text-accent">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
        <div className="max-w-sm mx-auto px-4 py-3">
          <div className="flex gap-3">
            <SecondaryButton onClick={onRetake} className="flex-1 py-3 justify-center gap-2" disabled={uploading}>
              <RefreshCcw className="w-3.5 h-3.5" />
              Retake
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => void onPost()}
              className="flex-1 py-3 justify-center gap-2 bg-white text-black hover:bg-white/90 active:bg-white/85"
              disabled={uploading}
              loading={uploading}
            >
              <Camera className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
