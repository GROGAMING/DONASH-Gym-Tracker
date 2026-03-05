"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSelectedPlayer } from "@/lib/playerSession";

export default function RequirePlayer({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const selected = getSelectedPlayer();
    if (selected) return;

    const next =
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

    router.replace(`/select-player?next=${encodeURIComponent(next)}`);
  }, [router]);

  const selected = getSelectedPlayer();
  if (!selected) return null;

  return children;
}
