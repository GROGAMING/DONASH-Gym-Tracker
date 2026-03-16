import React, { useState, useRef } from "react";
import { ImagePlus, X, FileImage } from "lucide-react";

interface UploadCardProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  preview: string | null;
  uploading: boolean;
  progress: number;
}

const UploadCard: React.FC<UploadCardProps> = ({
  onFileSelect,
  selectedFile,
  preview,
  uploading,
  progress,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const ALLOWED_PHOTO_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/gif",
    "image/bmp",
    "image/tiff",
  ]);

  const handleFile = (file: File) => {
    console.log("[UploadCard] File selected:", file.name, "type:", JSON.stringify(file.type), "size:", file.size, "bytes");
    const mimeOk = file.type === "" || ALLOWED_PHOTO_TYPES.has(file.type) || file.type.startsWith("image/");
    if (file && mimeOk) {
      onFileSelect(file);
    } else {
      console.warn("[UploadCard] File rejected — unexpected type:", JSON.stringify(file.type));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (uploading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card animate-fade-up">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileImage className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="w-full">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Uploading…</span>
              <span className="text-sm font-semibold text-accent">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Hang on, posting to your team…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card animate-fade-up">
        <div className="relative">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-52 object-cover"
          />
          <button
            onClick={() => onFileSelect(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/80 backdrop-blur flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
          <div className="absolute bottom-2 left-2 bg-foreground/70 backdrop-blur-sm text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {selectedFile?.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`
        w-full bg-card border-2 border-dashed rounded-2xl p-8
        flex flex-col items-center gap-3 transition-all duration-200 active-scale
        ${dragOver
          ? "border-accent bg-accent-muted"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
        }
      `}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? "bg-accent" : "bg-secondary"}`}>
        <ImagePlus className={`w-7 h-7 transition-colors ${dragOver ? "text-accent-foreground" : "text-muted-foreground"}`} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground text-[15px]">Add gym photo</p>
        <p className="text-xs text-muted-foreground mt-1">Tap to choose · drag & drop</p>
      </div>
      <span className="text-xs text-muted-foreground/60">JPG, PNG, HEIC up to 20MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
};

export default UploadCard;
