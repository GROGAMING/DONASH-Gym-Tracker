"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";

type User = { id: string; name: string };

export default function UploadPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);


  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("users").select("id,name").order("name");
      if (error) setStatus(error.message);
      else setUsers((data ?? []) as User[]);
    })();
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
            const compressed = new File([blob], "capture.jpg", { type: "image/jpeg" });
            resolve(compressed);
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function onSubmit(selectedFile?: File | null) {
    if (uploading) return;

    setStatus("");
    if (!userId) return setStatus("Select your name.");

    const f = selectedFile ?? file;
    if (!f) return setStatus("Take a photo.");

    setUploading(true);
    try {
      setStatus("Compressing photo...");
      const fileToUpload = await compressImage(f).catch(() => f); // fallback to original

      setStatus("Uploading...");
      const weekStart = mondayWeekStartISO(new Date());
      const ext = (fileToUpload.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${weekStart}/${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("gym-photos")
        .upload(path, fileToUpload, { 
          upsert: false, 
          contentType: fileToUpload.type,
          cacheControl: 'public, max-age=31536000, immutable'
        });

      if (upErr) return setStatus(upErr.message);

      const { error: insErr } = await supabase.from("uploads").insert({
        user_id: userId,
        image_path: path,
        status: "active"
      });

      if (insErr) return setStatus(insErr.message);

      setFile(null);
      setStatus("Uploaded.");
      window.alert("Uploaded! Go to Leaderboard.");
      router.push("/leaderboard");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Upload</h2>
      <label>Name</label>
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 16px" }}
        disabled={false}
      >
        <option value="">Select</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <label>Photo (camera)</label>
      <label
        htmlFor={userId ? "photo" : undefined}
        onClick={(e: MouseEvent<HTMLLabelElement>) => {
          if (!userId) {
            e.preventDefault();
            setStatus("Select your name.");
          }
        }}
        style={{
          display: "inline-block",
          padding: "10px 14px",
          margin: "8px 0 16px",
          border: "1px solid #ccc",
          borderRadius: 4,
          cursor: uploading || !userId ? "not-allowed" : "pointer",
          opacity: uploading || !userId ? 0.6 : 1
        }}
      >
        Take photo
      </label>
      <input
        id="photo"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f && userId && !uploading) void onSubmit(f);
        }}
        style={{ display: "none" }}
        disabled={uploading}
      />

      <button onClick={() => onSubmit()} style={{ padding: "10px 14px" }} disabled={uploading}>
        Upload
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
