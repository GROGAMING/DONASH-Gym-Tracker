"use client";

import { useState, useEffect } from "react";

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
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPaused(true);
      } else {
        setIsPaused(true); // require manual refresh
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  async function load(before?: string) {
    if (isPaused || loading) return;
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
    if (loading) return;
    setItems([]);
    setHasMore(true);
    await load();
    setIsPaused(false);
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Doom Scroll</h2>
      {isPaused && (
        <p style={{ color: "orange", fontWeight: "bold", marginBottom: 12 }}>
          Page paused to save data — press Refresh
        </p>
      )}
      <button onClick={refresh} disabled={loading} style={{ marginBottom: 16, padding: "8px 12px" }}>
        Refresh
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: 8,
              background: "#fafafa"
            }}
          >
            <img
              src={item.publicUrl}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 2 }}
            />
            <p style={{ margin: "8px 0 4px", fontSize: "0.9rem", fontWeight: "bold" }}>{item.name}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#666" }}>
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      {hasMore && items.length > 0 && items.length % 10 === 0 && (
        <button
          onClick={() => load(items[items.length - 1]?.created_at)}
          disabled={loading || isPaused}
          style={{ marginTop: 20, padding: "10px 16px" }}
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </main>
  );
}
