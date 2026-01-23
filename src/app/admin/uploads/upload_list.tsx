"use client";

import { useState } from "react";

type Item = {
  id: string;
  name: string;
  created_at: string;
  image_path: string;
  signedUrl: string;
};

export default function AdminUploadList({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [msg, setMsg] = useState("");

  async function del(id: string) {
    setMsg("");
    const res = await fetch("/api/admin/delete-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadId: id })
    });

    if (!res.ok) {
      const t = await res.text();
      setMsg(t || "Delete failed.");
      return;
    }

    setItems((x) => x.filter((i) => i.id !== id));
  }

  return (
    <>
      {msg && <p>{msg}</p>}
      {items.map((x) => (
        <div key={x.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>{x.name}</b> — {new Date(x.created_at).toLocaleString()}
            </div>
            <button onClick={() => del(x.id)} style={{ padding: "8px 10px" }}>
              Delete
            </button>
          </div>
          {x.signedUrl ? (
            <img src={x.signedUrl} alt="upload" style={{ width: "100%", maxWidth: 520, marginTop: 10 }} />
          ) : (
            <p style={{ marginTop: 10 }}>No image URL.</p>
          )}
        </div>
      ))}
    </>
  );
}
