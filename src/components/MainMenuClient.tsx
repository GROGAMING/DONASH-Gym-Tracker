"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import MainMenu from "@/components/MainMenu";

type MainTab = "home" | "upload" | "leaderboard" | "doomscroll" | "admin";

export default function MainMenuClient({ teamName }: { teamName: string }) {
  const router = useRouter();

  const onNavigate = useCallback(
    (tab: MainTab) => {
      switch (tab) {
        case "home":
          router.push("/");
          return;
        case "upload":
          router.push("/upload");
          return;
        case "leaderboard":
          router.push("/leaderboard");
          return;
        case "doomscroll":
          router.push("/doom-scroll");
          return;
        case "admin":
          router.push("/admin");
          return;
      }
    },
    [router],
  );

  return <MainMenu teamName={teamName} onNavigate={onNavigate} />;
}
