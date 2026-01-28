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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPaused(true);
      } else if (document.visibilityState === "visible") {
        // Don't auto-refresh when tab becomes visible
        // User must manually press Refresh
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    // Only load initial data on mount, no auto-refresh
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const res = await fetch("/api/doom-scroll");
      if (!res.ok) return;
      const newItems: Item[] = await res.json();
      setItems(newItems);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (isPaused || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastCreatedAt = items[items.length - 1]?.created_at;
      if (!lastCreatedAt) return;
      const res = await fetch(`/api/doom-scroll?before=${encodeURIComponent(lastCreatedAt)}&existingCount=${items.length}`);
      if (!res.ok) return;
      const newItems: Item[] = await res.json();
      setItems((prev) => [...prev, ...newItems]);
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    if (loading || loadingMore) return;
    await loadInitial();
    setIsPaused(false);
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Doom Scroll</h1>
      
      {isPaused && (
        <p style={{ color: "orange", fontWeight: "bold", marginBottom: 12 }}>
          Page paused to save data — press Refresh
        </p>
      )}
      
      <button onClick={refresh} disabled={loading || loadingMore} style={{ marginBottom: 16, padding: "8px 12px" }}>
        Refresh
      </button>

      {loading && <p>Loading...</p>}
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {items.map((x) => (
          <div
            key={x.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: 8,
              cursor: "pointer",
              background: "#fafafa"
            }}
            onClick={() => !isPaused && setSelected(x)}
          >
            <img
              src={x.publicUrl}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 2 }}
            />
            <p style={{ margin: "8px 0 4px", fontSize: "0.9rem", fontWeight: "bold" }}>{x.name}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#666" }}>
              {new Date(x.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      
      {items.length > 0 && items.length < 40 && items.length % 10 === 0 && (
        <button
          onClick={loadMore}
          disabled={loadingMore || isPaused}
          style={{ marginTop: 20, padding: "10px 16px" }}
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
      
      {selected && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: 20,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: 12 }}>
              <b>{selected.name}</b>
              <br />
              <span style={{ fontSize: "0.85rem", color: "#666" }}>
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>
            <img
              src={selected.publicUrl}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 4 }}
            />
            <button
              onClick={() => setSelected(null)}
              style={{ marginTop: 12, width: "100%", padding: "8px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
