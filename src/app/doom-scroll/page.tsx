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
  const [itemsById, setItemsById] = useState<Record<string, Item>>({});
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const lastUpdatedRef = useRef<string>("");

  const load = async () => {
    try {
      const res = await fetch("/api/gallery", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json();
        setStatus(err.error ?? "Failed to load");
        return;
      }
      const incoming: Item[] = await res.json();
      const incomingIds = incoming.map((x) => x.id);
      const currentTop = orderedIds[0];

      // If top is same, do nothing
      if (incomingIds[0] === currentTop) return;

      // Find new items not already in state
      const newOnes = incoming.filter((x) => !itemsById[x.id]);
      if (newOnes.length === 0) return;

      // Add new items to map
      const nextItemsById = { ...itemsById };
      for (const item of newOnes) {
        nextItemsById[item.id] = item;
      }

      // Merge IDs, dedupe while preserving order
      const nextOrderedIds = [...newOnes.map((x) => x.id), ...orderedIds];
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const id of nextOrderedIds) {
        if (!seen.has(id)) {
          seen.add(id);
          deduped.push(id);
        }
      }

      // Trim to 40
      const trimmed = deduped.slice(0, 40);

      setItemsById(nextItemsById);
      setOrderedIds(trimmed);
      lastUpdatedRef.current = new Date().toLocaleTimeString();
      setLastUpdated(lastUpdatedRef.current);
    } catch (e) {
      setStatus(String(e));
    }
  };

  useEffect(() => {
    load(); // initial load
    const interval = setInterval(load, 15000); // poll every 15 seconds
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
        {orderedIds.map((id) => {
          const item = itemsById[id];
          if (!item) return null;
          return (
            <div key={id} style={{ borderBottom: "1px solid #eee", paddingBottom: 16 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>{item.name}</p>
              <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#666" }}>
                {new Date(item.created_at).toLocaleString()}
              </p>
              {item.signedUrl ? (
                <img
                  src={item.signedUrl}
                  alt=""
                  loading="lazy"
                  style={{ maxWidth: "100%", height: "auto", borderRadius: 4 }}
                />
              ) : (
                <p style={{ color: "#999" }}>Image unavailable</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
