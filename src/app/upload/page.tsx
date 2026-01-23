"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";

type User = { id: string; name: string };

export default function UploadPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("users").select("id,name").order("name");
      if (error) setStatus(error.message);
      else setUsers((data ?? []) as User[]);
    })();
  }, []);

  async function onSubmit() {
    setStatus("");
    if (!userId) return setStatus("Select your name.");
    if (!file) return setStatus("Take a photo.");

    const weekStart = mondayWeekStartISO(new Date());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${weekStart}/${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("gym-photos")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (upErr) return setStatus(upErr.message);

    const { error: insErr } = await supabase.from("uploads").insert({
      user_id: userId,
      image_path: path,
      status: "active"
    });

    if (insErr) return setStatus(insErr.message);

    setFile(null);
    setStatus("Uploaded.");
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
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ display: "block", margin: "8px 0 16px" }}
      />

      <button onClick={onSubmit} style={{ padding: "10px 14px" }}>
        Upload
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
