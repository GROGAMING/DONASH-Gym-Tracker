"use client";

import { useEffect, useState, useRef } from "react";

type Item = {
  id: string;
  name: string;
  created_at: string;
  image_path: string;
  signedUrl: string;
};

export default function DoomScrollPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const firstIdRef = useRef<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/gallery");
      if (!res.ok) {
        const err = await res.json();
        setStatus(err.error ?? "Failed to load");
        return;
      }
      const data: Item[] = await res.json();
      const newFirstId = data[0]?.id ?? null;
      // Only update if first item changed or length changed
      if (newFirstId !== firstIdRef.current || data.length !== items.length) {
        setItems(data);
        firstIdRef.current = newFirstId;
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setStatus(String(e));
    }
  };

  useEffect(() => {
    load(); // initial load
    const interval = setInterval(load, 2000); // poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Doom Scroll</h2>
      {lastUpdated && (
        <p style={{ fontSize: "0.8rem", color: "#666", margin: "0 0 16px 0" }}>
          Last updated: {lastUpdated}
        </p>
      )}
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
