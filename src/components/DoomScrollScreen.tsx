"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import FeedList from "@/components/FeedList";
import { SecondaryButton } from "@/components/GymButtons";
import ToastBanner from "@/components/ToastBanner";
import type { FeedPost } from "@/components/FeedItem";

type Item = {
  id: string;
  name: string;
  created_at: string;
  image_path: string;
  url?: string | null;
  comment?: string | null;
  publicUrl: string;
};

type ToastState = { message: string; type: "success" | "error" };

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function mapItemToPost(x: Item): FeedPost {
  return {
    id: x.id,
    playerName: x.name,
    timestamp: formatTimestamp(x.created_at),
    image: x.url || x.publicUrl,
    caption: typeof x.comment === "string" && x.comment.trim().length > 0 ? x.comment : undefined,
    initials: initialsFromName(x.name),
  };
}

export default function DoomScrollScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const posts = useMemo(() => items.map(mapItemToPost), [items]);

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

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/doom-scroll");
      if (!res.ok) {
        setToast({ message: "Failed to load feed.", type: "error" });
        return;
      }
      const newItems: Item[] = await res.json();
      setItems(newItems);
    } catch {
      setToast({ message: "Failed to load feed.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only load initial data on mount, no auto-refresh
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (isPaused || loadingMore) return;
    setLoadingMore(true);
    setToast(null);
    try {
      const lastCreatedAt = items[items.length - 1]?.created_at;
      if (!lastCreatedAt) return;
      const res = await fetch(
        `/api/doom-scroll?before=${encodeURIComponent(lastCreatedAt)}&existingCount=${items.length}`,
      );
      if (!res.ok) {
        setToast({ message: "Failed to load more.", type: "error" });
        return;
      }
      const newItems: Item[] = await res.json();
      setItems((prev) => [...prev, ...newItems]);
    } catch {
      setToast({ message: "Failed to load more.", type: "error" });
    } finally {
      setLoadingMore(false);
    }
  }, [isPaused, items, loadingMore]);

  const refresh = useCallback(async () => {
    if (loading || loadingMore) return;
    await loadInitial();
    setIsPaused(false);
  }, [loadInitial, loading, loadingMore]);

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="max-w-sm mx-auto animate-fade-up">
        <div className="px-4 pt-5 mb-2">
          <BackButton onClick={onBack} />
        </div>

        <div className="px-4 pt-2 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
              <ScrollText className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Doom Scroll</h2>
              <p className="text-xs text-muted-foreground">Every session the squad has logged</p>
            </div>
            <SecondaryButton onClick={refresh} disabled={loading || loadingMore}>
              Refresh
            </SecondaryButton>
          </div>

          {isPaused && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-amber-700">
                Page paused to save data — press Refresh
              </p>
            </div>
          )}
        </div>

        <FeedList posts={posts} loading={loading} />

        {items.length > 0 && items.length < 40 && items.length % 10 === 0 && (
          <div className="px-4 pb-6">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore || isPaused}
              className="
                w-full bg-card border border-border rounded-xl
                py-3 text-sm font-semibold text-foreground
                shadow-card hover:shadow-card-hover
                transition-all duration-150 active-scale
                disabled:opacity-50 disabled:pointer-events-none
              "
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
