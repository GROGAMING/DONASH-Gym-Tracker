import React, { useRef, useState } from "react";
import { Camera, RefreshCcw, Check, FileImage } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./GymButtons";

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  preview: string | null;
  onRetake: () => void;
  onUse: () => void;
  uploading: boolean;
  progress: number;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  preview,
  onRetake,
  onUse,
  uploading,
  progress,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const url = URL.createObjectURL(file);
    // Small delay to show loading feel
    setTimeout(() => {
      onCapture(file, url);
      setLoading(false);
    }, 150);
  };

  // ── Uploading state ──────────────────────────────────────────────────────────
  if (uploading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card animate-fade-up">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileImage className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="w-full">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Posting…</span>
              <span className="text-sm font-semibold text-accent">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Sending to your team…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Photo preview state ───────────────────────────────────────────────────────
  if (preview) {
    return (
      <div className="flex flex-col gap-4 animate-fade-up">
        {/* Photo preview */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="relative w-full" style={{ paddingBottom: "75%" }}>
            <img
              src={preview}
              alt="Captured gym photo"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-foreground/70 backdrop-blur-sm text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" />
              Photo captured
            </div>
          </div>
        </div>

        {/* Retake / Use actions */}
        <div className="flex gap-3">
          <SecondaryButton
            onClick={onRetake}
            className="flex-1 py-3 justify-center gap-2"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Retake
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={onUse}
            className="flex-1 py-3 justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            Use Photo
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // ── Initial capture state ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* Camera placeholder card */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="
          w-full bg-card border-2 border-dashed border-border rounded-2xl
          flex flex-col items-center justify-center gap-4 py-14
          hover:border-foreground/20 hover:bg-muted/20
          transition-all duration-200 active-scale shadow-card
        "
      >
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
          <Camera className="w-8 h-8 text-foreground" strokeWidth={1.5} />
        </div>
        <div className="text-center px-4">
          <p className="font-display font-bold text-[17px] text-foreground">
            {loading ? "Opening camera…" : "Take a Photo"}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Tap to open your camera and capture today's session
          </p>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase">
          Camera only · no gallery
        </span>
      </button>

      {/* Prominent CTA */}
      <PrimaryButton onClick={() => inputRef.current?.click()} loading={loading}>
        <Camera className="w-4 h-4" />
        Take Photo
      </PrimaryButton>

      {/* Hidden file input — capture="environment" forces rear camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

export default CameraCapture;
