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

  async function onSubmit(selectedFile?: File | null) {
    if (uploading) return;

    setStatus("");
    if (!userId) return setStatus("Select your name.");

    const f = selectedFile ?? file;
    if (!f) return setStatus("Take a photo.");

    setUploading(true);
    try {
      const weekStart = mondayWeekStartISO(new Date());
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${weekStart}/${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("gym-photos")
        .upload(path, f, { upsert: false, contentType: f.type });

      if (upErr) return setStatus(upErr.message);

      const { error: insErr } = await supabase.from("uploads").insert({
        user_id: userId,
        image_path: path,
        status: "active"
      });

      if (insErr) return setStatus(insErr.message);

      setFile(null);
      setStatus("Uploaded.");
      window.alert("Uploaded! Taking you to Doom Scroll.");
      router.push(`/doom-scroll?ts=${Date.now()}`);
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
