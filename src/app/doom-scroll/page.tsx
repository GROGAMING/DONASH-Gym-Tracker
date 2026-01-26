"use client";

import { useState } from "react";

type Item = {
  id: string;
  name: string;
  created_at: string;
  image_path: string;
  publicUrl: string;
};

export default function DoomScrollPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function load(before?: string) {
    setLoading(true);
    try {
      const url = before ? `/api/doom-scroll?before=${encodeURIComponent(before)}` : "/api/doom-scroll";
      const res = await fetch(url);
      if (!res.ok) return;
      const newItems: Item[] = await res.json();
      if (before) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(newItems.length === 10 && items.length + newItems.length < 40);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setItems([]);
    setHasMore(true);
    await load();
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Doom Scroll</h2>
      <button onClick={refresh} style={{ marginBottom: 16, padding: "8px 12px" }}>
        Refresh
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {items.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px solid #eee", paddingBottom: 16 }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>{item.name}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#666" }}>
              {new Date(item.created_at).toLocaleString()}
            </p>
            {item.publicUrl ? (
              <img
                src={item.publicUrl}
                alt=""
                loading="lazy"
                style={{ maxWidth: "100%", height: "auto", borderRadius: 4 }}
              />
            ) : (
              <p style={{ color: "#999" }}>Image unavailable</p>
            )}
          </div>
        ))}
      </div>
      {hasMore && items.length > 0 && items.length % 10 === 0 && (
        <button
          onClick={() => load(items[items.length - 1]?.created_at)}
          disabled={loading}
          style={{ marginTop: 20, padding: "10px 16px" }}
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </main>
  );
}
