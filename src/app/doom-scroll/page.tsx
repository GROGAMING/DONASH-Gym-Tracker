"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  created_at: string;
  signedUrl: string | null;
};

export default function DoomScrollPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/gallery");
        if (!res.ok) {
          const err = await res.json();
          setStatus(err.error ?? "Failed to load");
          return;
        }
        const data = await res.json();
        setItems(data);
      } catch (e) {
        setStatus(String(e));
      }
    })();
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Doom Scroll</h2>
      {status && <p style={{ color: "red" }}>{status}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {items.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px solid #eee", paddingBottom: 16 }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>{item.name}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#666" }}>
              {new Date(item.created_at).toLocaleString()}
            </p>
            {item.signedUrl ? (
              <img
                src={item.signedUrl}
                alt=""
                style={{ maxWidth: "100%", height: "auto", borderRadius: 4 }}
              />
            ) : (
              <p style={{ color: "#999" }}>Image unavailable</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
